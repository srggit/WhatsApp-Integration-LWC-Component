public with sharing class WhatsAppController {

    @AuraEnabled(cacheable=true)
    public static Contact getContact(Id contactId) {
        Contact c = [
            SELECT Phone, Name, FirstName, LastName
            FROM Contact 
            WHERE Id = :contactId 
            AND Phone != null
            LIMIT 1
        ];
        System.debug('################## getContact() Executed ##################');

        return c;
    }

    @AuraEnabled
    public static void markChatAsRead(Id contact_id, String phone) {

        try {
            update new Contact(
                Id = contact_id,
                Last_Chat_Opened_At__c = System.now()
            );
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // @AuraEnabled(cacheable=true)
    // public static List<Contact> getAllContacts() {
    //     return [
    //         SELECT Id, Name, Phone
    //         FROM Contact
    //         WHERE Phone != null
    //         ORDER BY LastModifiedDate DESC
    //         LIMIT 200
    //     ];
    // }

    /*
    @AuraEnabled(cacheable=true)
    public static List<Contact> getContactsPaginated(String lastContactId, Integer limitSize) {

        if (limitSize == null) {
            limitSize = 200;
        }

        if (String.isBlank(lastContactId)) {
            return [
                SELECT Id, Name, Phone, LastModifiedDate, CreatedDate, 
                LastActivityDate
                FROM Contact
                WHERE Phone != null
                ORDER BY CreatedDate DESC
                LIMIT :limitSize
            ];
        }

        // Get last record CreatedDate
        Contact lastContact = [
            SELECT CreatedDate
            FROM Contact
            WHERE Id = :lastContactId
            LIMIT 1
        ];

        return [
            SELECT Id, Name, Phone, LastModifiedDate, CreatedDate,
            LastActivityDate
            FROM Contact
            WHERE Phone != null
            AND CreatedDate < :lastContact.CreatedDate
            ORDER BY CreatedDate DESC
            LIMIT :limitSize
        ];
    }
    */

    // Create wrapper class for contact
    public class ContactChatWrapper {

        @AuraEnabled public Contact contact;
        @AuraEnabled public String phone;
        @AuraEnabled public String lastMessage;
        @AuraEnabled public Datetime lastMessageTime;
        @AuraEnabled public String direction;
        @AuraEnabled public String deliveryStatus;
        @AuraEnabled public Boolean hasUnreadMessages;
        @AuraEnabled public Integer unreadCount;
    }

    @AuraEnabled
    public static List<ContactChatWrapper> getContactsPaginated(
        String lastContactId,
        Integer limitSize
    ) {

        if (limitSize == null) {
            limitSize = 200;
        }

        // ============================================
        // STEP 1 — FETCH CONTACTS
        // ============================================

        List<Contact> contacts;

        if (String.isBlank(lastContactId)) {

            contacts = [
                SELECT Id,
                    Name,
                    Phone,
                    LastModifiedDate,
                    CreatedDate,
                    LastActivityDate,
                    Last_Chat_Opened_At__c
                FROM Contact
                WHERE Phone != null
                ORDER BY CreatedDate DESC
                LIMIT :limitSize
            ];

        } else {

            Contact lastContact = [
                SELECT CreatedDate FROM Contact WHERE Id = :lastContactId LIMIT 1];

            contacts = [
                SELECT Id,
                    Name,
                    Phone,
                    LastModifiedDate,
                    CreatedDate,
                    LastActivityDate,
                    Last_Chat_Opened_At__c
                FROM Contact
                WHERE Phone != null
                AND CreatedDate < :lastContact.CreatedDate
                ORDER BY CreatedDate DESC NULLS FIRST
                LIMIT :limitSize
            ];
        }

        // ============================================
        // STEP 2 — COLLECT PHONES
        // ============================================

        Set<String> phones = new Set<String>();

        for (Contact con : contacts) {

            if (String.isNotBlank(con.Phone)) {
                phones.add(con.Phone);
            }
        }

        // ============================================
        // STEP 3 — GET ALL MESSAGES
        // ============================================

        Map<String, WhatsApp_Messages__c> latestMessageMap = new Map<String, WhatsApp_Messages__c>();
        Map<String, Integer> unreadCountMap = new Map<String, Integer>();

        if (!phones.isEmpty()) {

            List<WhatsApp_Messages__c> allMessages = [

                SELECT Id,
                    Phone__c,
                    Message_Text__c,
                    CreatedDate,
                    Direction__c,
                    Message_Delivery_Status__c
                FROM WhatsApp_Messages__c
                WHERE Phone__c IN :phones
                ORDER BY CreatedDate DESC
            ];

            // ============================================
            // STEP 3.1 — LATEST MESSAGE
            // STEP 3.2 — UNREAD COUNT
            // ============================================

            Map<String, Datetime> contactLastOpenedMap = new Map<String, Datetime>();

            for (Contact con : contacts) {
                contactLastOpenedMap.put(con.Phone, con.Last_Chat_Opened_At__c);
            }

            for (WhatsApp_Messages__c msg : allMessages) {

                // ============================================
                // LATEST MESSAGE
                // ============================================

                if (!latestMessageMap.containsKey(msg.Phone__c)) {
                    latestMessageMap.put(msg.Phone__c, msg);
                }

                // ============================================
                // UNREAD COUNT
                // ============================================

                if (msg.Direction__c == 'Inbound') {

                    Datetime lastOpened = contactLastOpenedMap.get(msg.Phone__c);

                    Boolean isUnread = false;

                    if (lastOpened == null) {
                        isUnread = true;
                    } 
                    else if (msg.CreatedDate > lastOpened) {
                        isUnread = true;
                    }

                    if (isUnread) {

                        Integer count = unreadCountMap.containsKey(msg.Phone__c) ? unreadCountMap.get(msg.Phone__c) : 0;
                        unreadCountMap.put(msg.Phone__c, count + 1);
                    }
                }
            }
        }

        // ============================================
        // STEP 4 — BUILD WRAPPERS
        // ============================================

        List<ContactChatWrapper> wrappers = new List<ContactChatWrapper>();

        for (Contact con : contacts) {

            ContactChatWrapper wrapper = new ContactChatWrapper();

            wrapper.contact = con;
            wrapper.phone = con.Phone;
            wrapper.hasUnreadMessages = false;

            wrapper.unreadCount = 
                unreadCountMap.containsKey(con.Phone)
                ? unreadCountMap.get(con.Phone)
                : 0;

            if (wrapper.unreadCount > 0) {
                wrapper.hasUnreadMessages = true;
            }

            if (latestMessageMap.containsKey(con.Phone)) {

                WhatsApp_Messages__c msg = latestMessageMap.get(con.Phone);

                wrapper.lastMessage = msg.Message_Text__c;
                wrapper.lastMessageTime = msg.CreatedDate;
                wrapper.direction = msg.Direction__c;
                wrapper.deliveryStatus = msg.Message_Delivery_Status__c;
            }

            wrappers.add(wrapper);
        }

        System.debug('################## getContactsPaginated() Executed ##################');

        System.debug('wrappers: ' + wrappers);

        return wrappers;
    }

    @AuraEnabled(cacheable=true)
    public static List<Contact> searchContacts(String searchTerm) {

        if (String.isBlank(searchTerm)) {
            return new List<Contact>();
        }

        String likeTerm = '%' + searchTerm + '%';

        return [
            SELECT Id, Name, Phone, LastModifiedDate, CreatedDate,
            LastActivityDate
            FROM Contact
            WHERE Phone != null
            AND (
                Name LIKE :likeTerm
                OR Phone LIKE :likeTerm
            )
            ORDER BY LastModifiedDate DESC
            LIMIT 200
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<WhatsApp_Messages__c> getMessages(String phone) {
        return [
            SELECT Id, Phone__c, Message_Text__c, Direction__c, CreatedDate, Message_From__c, Message_Id__c, 
            Messaged_To__c, Received_At__c, Delivered_At__c, Read_At__c, Message_Delivery_Status__c, WhatsApp_Id__c
            FROM WhatsApp_Messages__c
            WHERE Phone__c = :phone
            ORDER BY CreatedDate ASC
        ];
    }

    @AuraEnabled
    public static List<WhatsApp_Messages__c> getMessages2(String phone) {
        return [
            SELECT Id, Phone__c, Message_Text__c, Direction__c, CreatedDate, Message_From__c, Message_Id__c, 
            Messaged_To__c, Received_At__c, Delivered_At__c, Read_At__c, Message_Delivery_Status__c, WhatsApp_Id__c
            FROM WhatsApp_Messages__c
            WHERE Phone__c = :phone
            ORDER BY CreatedDate ASC
        ];
    }

    // Get last seen time of the customer
    @AuraEnabled
    public static Datetime getLastSeen(String phone) {

        List<WhatsApp_Messages__c> msgs = [
            SELECT Received_At__c
            FROM WhatsApp_Messages__c
            WHERE Phone__c = :phone
            AND Direction__c = 'Inbound'
            ORDER BY Received_At__c DESC
            LIMIT 1
        ];

        return msgs.isEmpty() ? null : msgs[0].Received_At__c;
    }
    
    @AuraEnabled
    public static String sendMessage(String phone, String message, Id contactId) {

        System.debug('################## sendMessage() Executed ##################');

        try {

            HttpRequest req = new HttpRequest();
            req.setEndpoint('https://graph.facebook.com/v25.0/935200896346534/messages');
            req.setMethod('POST');

            req.setHeader('Authorization', 'Bearer EAA34Pw2xSHYBRTWOOUWvUNoQZAmNw65K1A8ImIMkBP8qM6FIceqjesxaAil6hp7aqzSOvqrhevUeBW8njEuXtiooFuH6x7lSCmYeOt0axqW7xBMfNh22CuFrbbjw8fDRscL30wmoon49PiDajSyVbmiJ7eXKYp16iYmnTTdbWfGEmLbkZA0eaHrKwc0EulPkRjpFejUhdSZAnvxtPzS6WJEQI9ZBCjAvHzPPenr5tmI2xxT6mqdjF2WCDI2WIHpCeFuDZAJFbUZAFI8OCV2vL4O0XlAdwZD');
            req.setHeader('Content-Type', 'application/json');

            Map<String, Object> bodyMap = new Map<String, Object>{
                'messaging_product' => 'whatsapp',
                'to' => phone,
                'type' => 'text',
                'text' => new Map<String, String>{
                    'body' => message
                }
            };

            req.setBody(JSON.serialize(bodyMap));

            Http http = new Http();
            HttpResponse res = http.send(req);

            System.debug('Meta Response: ' + res.getBody());

            // HANDLE ERROR FIRST
            if (res.getStatusCode() != 200) {

                Map<String, Object> errorMap =
                    (Map<String, Object>) JSON.deserializeUntyped(res.getBody());

                String errorMessage = 'Unknown error';

                if (errorMap.containsKey('error')) {
                    Map<String, Object> err = (Map<String, Object>) errorMap.get('error');
                    errorMessage = (String) err.get('message');
                }

                // THROW ERROR → Goes to LWC
                throw new AuraHandledException(errorMessage);
            }

            // SUCCESS FLOW
            String messageId;
            String waId;
            String messagingProduct;

            Map<String, Object> responseMap =
                (Map<String, Object>) JSON.deserializeUntyped(res.getBody());

            if (responseMap.containsKey('messaging_product')) {
                messagingProduct = (String) responseMap.get('messaging_product');
            }

            if (responseMap.containsKey('messages')) {
                List<Object> messages = (List<Object>) responseMap.get('messages');

                if (!messages.isEmpty()) {
                    Map<String, Object> msgObj = (Map<String, Object>) messages[0];
                    messageId = (String) msgObj.get('id');
                }
            }

            if (responseMap.containsKey('contacts')) {
                List<Object> contacts = (List<Object>) responseMap.get('contacts');

                if (!contacts.isEmpty()) {
                    Map<String, Object> contactObj = (Map<String, Object>) contacts[0];
                    waId = (String) contactObj.get('wa_id');
                }
            }

            // INSERT ONLY AFTER SUCCESS
            WhatsApp_Messages__c msg = new WhatsApp_Messages__c(
                Messaged_To__c = phone,
                Phone__c = phone,
                Message_Text__c = message,
                Direction__c = 'Outbound',
                Message_Id__c = messageId,
                WhatsApp_Id__c = waId,
                Contact__c = contactId,
                Messaging_Product__c = messagingProduct
            );

            insert msg;
            return 'SUCCESS';

        } catch (Exception e) {

            System.debug('Send Message Error: ' + e.getMessage());

            // Send error to LWC
            throw new AuraHandledException(e.getMessage());
        }
    }

    /*
    @AuraEnabled
    public static void sendMessage(String phone, String message) {
        // Infobip API call
        HttpRequest req = new HttpRequest();
        req.setEndpoint('https://8vrkpd.api.infobip.com/whatsapp/1/message/text');
        req.setMethod('POST');

        req.setHeader('Authorization', 'App f80ee10b2aa4fd71fe5a6dfa61434581-64ea5958-889a-4d4a-9041-65fe006c45d7');
        req.setHeader('Content-Type', 'application/json');

        String body = JSON.serialize(new Map<String, Object>{
            'from' => '447860088970', // your Infobip sender
            'to' => phone,
            'content' => new Map<String, String>{
                'text' => message
            }
        });
        System.debug('Body: ' + body);

        req.setBody(body);

        Http http = new Http();
        HttpResponse res = http.send(req);

        // Save message in Salesforce
        WhatsApp_Messages__c msg = new WhatsApp_Messages__c(
            Messaged_To__c = phone,
            Phone__c = phone,
            Message_Text__c = message,
            Direction__c = 'Outbound',
            Received_At__c = System.now()
        );

        insert msg;
    }
	*/
}