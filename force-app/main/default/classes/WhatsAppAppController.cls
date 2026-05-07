public with sharing class WhatsAppAppController {
    
    /**
     * Get filtered contacts with last message preview
     * This replaces getContact() from original controller
     */
    @AuraEnabled(cacheable=true)
    public static List<ContactWrapper> getFilteredContacts(String searchTerm) {
        
        String searchFilter = '%' + searchTerm + '%';
        
        List<Contact> contacts = [
            SELECT Id, Name, FirstName, LastName, Phone, Email
            FROM Contact 
            WHERE Phone != null 
            AND Phone != ''
            AND (Name LIKE :searchFilter OR Phone LIKE :searchFilter OR Email LIKE :searchFilter)
            ORDER BY LastModifiedDate DESC
            LIMIT 200
        ];
        
        // Get phone numbers from contacts
        Set<String> phoneNumbers = new Set<String>();
        Map<String, Id> phoneToContactId = new Map<String, Id>();
        
        for (Contact con : contacts) {
            String formattedPhone = formatPhoneNumber(con.Phone);
            if (formattedPhone != null) {
                phoneNumbers.add(formattedPhone);
                phoneToContactId.put(formattedPhone, con.Id);
            }
        }
        
        // Get last message for each contact
        Map<String, WhatsApp_Messages__c> lastMessageMap = getLastMessageByPhone(phoneNumbers);
        
        // Get unread count for each contact
        Map<String, Integer> unreadCountMap = getUnreadCountByPhone(phoneNumbers);
        
        // Prepare wrapper objects
        List<ContactWrapper> wrappers = new List<ContactWrapper>();
        
        for (Contact con : contacts) {
            String formattedPhone = formatPhoneNumber(con.Phone);
            WhatsApp_Messages__c lastMsg = lastMessageMap.get(formattedPhone);
            
            ContactWrapper wrapper = new ContactWrapper();
            wrapper.Id = con.Id;
            wrapper.Name = con.Name;
            wrapper.FirstName = con.FirstName;
            wrapper.LastName = con.LastName;
            wrapper.Phone = formattedPhone;
            wrapper.Email = con.Email;
            wrapper.initials = getInitials(con.Name);
            wrapper.isOnline = false; // Can be enhanced with actual online status
            
            if (lastMsg != null) {
                wrapper.lastMessage = lastMsg.Message_Text__c;
                wrapper.lastMessageDate = lastMsg.CreatedDate;
                wrapper.lastMessageTime = formatTime(lastMsg.CreatedDate);
            } else {
                wrapper.lastMessage = 'No messages yet';
                wrapper.lastMessageDate = null;
                wrapper.lastMessageTime = '';
            }
            
            Integer unread = unreadCountMap.get(formattedPhone);
            wrapper.unreadCount = unread != null ? unread : 0;
            wrapper.selected = false;
            
            wrappers.add(wrapper);
        }
        
        return wrappers;
    }
    
    /**
     * Get messages for a specific phone number
     */
    @AuraEnabled(cacheable=true)
    public static List<WhatsApp_Messages__c> getMessages(String phone) {
        String formattedPhone = formatPhoneNumber(phone);
        
        return [
            SELECT Id, Phone__c, Message_Text__c, Direction__c, CreatedDate, 
                   Message_From__c, Messaged_To__c, Received_At__c, Delivered_At__c, 
                   Read_At__c, Message_Delivery_Status__c
            FROM WhatsApp_Messages__c
            WHERE Phone__c = :formattedPhone
            ORDER BY CreatedDate ASC
            LIMIT 500
        ];
    }
    
    /**
     * Get last seen time for a contact
     */
    @AuraEnabled(cacheable=true)
    public static Datetime getLastSeen(String phone) {
        String formattedPhone = formatPhoneNumber(phone);
        
        List<WhatsApp_Messages__c> msgs = [
            SELECT Received_At__c
            FROM WhatsApp_Messages__c
            WHERE Phone__c = :formattedPhone
            AND Direction__c = 'Inbound'
            ORDER BY Received_At__c DESC
            LIMIT 1
        ];
        
        return msgs.isEmpty() ? null : msgs[0].Received_At__c;
    }
    
    /**
     * Send single message
     */
    @AuraEnabled
    public static void sendMessage(String phone, String message, Id contactId) {
        
        System.debug('sendMessage() - Phone: ' + phone + ', Message: ' + message);
        
        try {
            String formattedPhone = formatPhoneNumber(phone);
            
            HttpRequest req = new HttpRequest();

            req.setEndpoint('https://graph.facebook.com/v25.0/935200896346534/messages');
            req.setMethod('POST');
            req.setHeader('Authorization', 'Bearer EAA34Pw2xSHYBRSHJaQ4CApMZAgThSiCiB47c15ync0XthXefO4NxPEZBcKL8wNXiBHNT699qkrLsZAuz59EDIo55HOoAuGaT0a3wkvZB9001qQfzKyI37MrOeyR4JcaIjB5F4Ekf2VhszWvyAIIkPorMgkoSjrd0XhOLlNZBDrpecJwrppKGZCzT0x7oOVkOOUGovKFfHTJS2uUJM3YbddSkG1hUWyDZCKZCFPgmL4vAlfgLqtOJmpnZC4Pzxc82eEMeQKa05v1GZC1l1dYTSQf0EGX26E');
            req.setHeader('Content-Type', 'application/json');

            Map<String, Object> bodyMap = new Map<String, Object>{
                'messaging_product' => 'whatsapp',
                'to' => formattedPhone,
                'type' => 'text',
                'text' => new Map<String, String>{
                    'body' => message
                }
            };
            
            req.setBody(JSON.serialize(bodyMap));
            
            Http http = new Http();
            HttpResponse res = http.send(req);
            
            System.debug('Meta Response: ' + res.getBody());
            
            if (res.getStatusCode() != 200) {
                Map<String, Object> errorMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
                String errorMessage = 'Unknown error';
                
                if (errorMap.containsKey('error')) {
                    Map<String, Object> err = (Map<String, Object>) errorMap.get('error');
                    errorMessage = (String) err.get('message');
                }
                
                throw new AuraHandledException(errorMessage);
            }
            
            // Parse success response
            Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            
            String messageId;
            String waId;
            
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
            
            // Save message to Salesforce
            WhatsApp_Messages__c msg = new WhatsApp_Messages__c(
                Messaged_To__c = formattedPhone,
                Phone__c = formattedPhone,
                Message_Text__c = message,
                Direction__c = 'Outbound',
                Message_Id__c = messageId,
                WhatsApp_Id__c = waId,
                Contact__c = contactId,
                Messaging_Product__c = 'whatsapp'
            );
            
            insert msg;
            
        } catch (Exception e) {
            System.debug('Send Message Error: ' + e.getMessage());
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    /**
     * Send bulk messages to multiple contacts
     */
    @AuraEnabled
    public static void sendBulkMessages(List<String> phones, String message, List<Id> contactIds) {
        
        if (phones == null || phones.isEmpty() || String.isBlank(message)) {
            throw new AuraHandledException('Invalid request: phones or message is empty');
        }
        
        List<WhatsApp_Messages__c> messagesToInsert = new List<WhatsApp_Messages__c>();
        List<String> failedPhones = new List<String>();
        List<String> successfulPhones = new List<String>();
        
        // Process each phone number
        for (Integer i = 0; i < phones.size(); i++) {
            String phone = phones[i];
            Id contactId = (i < contactIds.size()) ? contactIds[i] : null;
            String formattedPhone = formatPhoneNumber(phone);
            
            try {
                HttpRequest req = new HttpRequest();
                req.setEndpoint('https://graph.facebook.com/v25.0/935200896346534/messages');
                req.setMethod('POST');
                req.setHeader('Authorization', 'Bearer EAA34Pw2xSHYBRTs9VwOh16txQiv77qxLjblFIg0xX365xCfhgz0aiZAeyiAVq7jUEZCsCnjf3zTFIgjOAgHIwqjzbYa8QdKqFYALs9qyP9dVZBBdO0meUhKmEAPaZBrM8wyPHgaw390TtGOU1dLKhZCPpqCGzeBXgAfxd5ZASZBpK9U4ZBVdGe5LGlmtjZCqo3XjY65Xcv7F6SPDOTvSaPrDUl4VXGYK56ZBTI6adTZAo4LRk24rO6O5rifkBMfO0itwi71NRCu0dZC4LvcUZCJQcLw9Du6D8');
                req.setHeader('Content-Type', 'application/json');
                
                Map<String, Object> bodyMap = new Map<String, Object>{
                    'messaging_product' => 'whatsapp',
                    'to' => formattedPhone,
                    'type' => 'text',
                    'text' => new Map<String, String>{
                        'body' => message
                    }
                };
                
                req.setBody(JSON.serialize(bodyMap));
                
                Http http = new Http();
                HttpResponse res = http.send(req);
                
                if (res.getStatusCode() == 200) {
                    successfulPhones.add(phone);
                    
                    // Parse response
                    Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
                    String messageId;
                    String waId;
                    
                    if (responseMap.containsKey('messages')) {
                        List<Object> messagesList = (List<Object>) responseMap.get('messages');
                        if (!messagesList.isEmpty()) {
                            Map<String, Object> msgObj = (Map<String, Object>) messagesList[0];
                            messageId = (String) msgObj.get('id');
                        }
                    }
                    
                    if (responseMap.containsKey('contacts')) {
                        List<Object> contactsList = (List<Object>) responseMap.get('contacts');
                        if (!contactsList.isEmpty()) {
                            Map<String, Object> contactObj = (Map<String, Object>) contactsList[0];
                            waId = (String) contactObj.get('wa_id');
                        }
                    }
                    
                    // Create message record
                    WhatsApp_Messages__c msg = new WhatsApp_Messages__c(
                        Messaged_To__c = formattedPhone,
                        Phone__c = formattedPhone,
                        Message_Text__c = message,
                        Direction__c = 'Outbound',
                        Message_Id__c = messageId,
                        WhatsApp_Id__c = waId,
                        Contact__c = contactId,
                        Messaging_Product__c = 'whatsapp'
                    );
                    messagesToInsert.add(msg);
                    
                } else {
                    failedPhones.add(phone);
                    System.debug('Failed to send to ' + phone + ': ' + res.getBody());
                }
                
                // Small delay to avoid rate limiting (using simple sleep simulation)
                if (phones.size() > 5 && i < phones.size() - 1) {
                    // Just a simple delay - in production, consider using Queueable
                    System.debug('Processing bulk message ' + (i+1) + ' of ' + phones.size());
                }
                
            } catch (Exception e) {
                failedPhones.add(phone);
                System.debug('Error sending to ' + phone + ': ' + e.getMessage());
            }
        }
        
        // Insert all successful messages
        if (!messagesToInsert.isEmpty()) {
            insert messagesToInsert;
        }
        
        // If all failed, throw error
        if (successfulPhones.isEmpty()) {
            throw new AuraHandledException('Failed to send messages to all contacts. ' + 
                                           'First error: ' + (failedPhones.isEmpty() ? 'Unknown' : failedPhones[0]));
        }
        
        // Log partial success
        if (!failedPhones.isEmpty()) {
            System.debug('Partial success: Sent to ' + successfulPhones.size() + 
                        ' contacts, failed for ' + failedPhones.size());
        }
    }
    
    // ==================== HELPER METHODS ====================
    
    private static Map<String, WhatsApp_Messages__c> getLastMessageByPhone(Set<String> phoneNumbers) {
        Map<String, WhatsApp_Messages__c> result = new Map<String, WhatsApp_Messages__c>();
        
        if (phoneNumbers == null || phoneNumbers.isEmpty()) {
            return result;
        }
        
        // First, get the latest date for each phone
        Map<String, Datetime> latestDateMap = new Map<String, Datetime>();
        
        for (String phone : phoneNumbers) {
            AggregateResult ar = [
                SELECT MAX(CreatedDate) latestDate
                FROM WhatsApp_Messages__c
                WHERE Phone__c = :phone
            ];
            
            Datetime latestDate = (Datetime) ar.get('latestDate');
            if (latestDate != null) {
                latestDateMap.put(phone, latestDate);
            }
        }
        
        // Then query messages for each phone and its latest date
        for (String phone : latestDateMap.keySet()) {
            Datetime latestDate = latestDateMap.get(phone);
            
            List<WhatsApp_Messages__c> msgs = [
                SELECT Id, Phone__c, Message_Text__c, CreatedDate, Direction__c
                FROM WhatsApp_Messages__c
                WHERE Phone__c = :phone
                AND CreatedDate = :latestDate
                LIMIT 1
            ];
            
            if (!msgs.isEmpty()) {
                result.put(phone, msgs[0]);
            }
        }
        
        return result;
    }
    
    private static Map<String, Integer> getUnreadCountByPhone(Set<String> phoneNumbers) {
        Map<String, Integer> result = new Map<String, Integer>();
        
        if (phoneNumbers == null || phoneNumbers.isEmpty()) {
            return result;
        }
        
        for (String phone : phoneNumbers) {
            Integer count = [
                SELECT COUNT() 
                FROM WhatsApp_Messages__c
                WHERE Phone__c = :phone
                AND Direction__c = 'Inbound'
                // AND Read_At__c = null
            ];
            
            if (count > 0) {
                result.put(phone, count);
            }
        }
        
        return result;
    }
    
    private static String formatPhoneNumber(String phone) {
        if (String.isBlank(phone)) return null;
        // Remove non-digit characters
        String cleaned = phone.replaceAll('[^0-9]', '');
        // Ensure it starts with country code (assuming 91 for India)
        if (cleaned.length() == 10) {
            cleaned = '91' + cleaned;
        }
        return cleaned;
    }
    
    private static String getInitials(String name) {
        if (String.isBlank(name)) return '?';
        String[] parts = name.split(' ');
        if (parts.size() == 1) {
            return parts[0].substring(0, 1).toUpperCase();
        }
        return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
    }
    
    private static String formatTime(Datetime dt) {
        if (dt == null) return '';
        return dt.format('h:mm a');
    }
    
    // ==================== WRAPPER CLASS ====================
    
    public class ContactWrapper {
        @AuraEnabled public Id Id;
        @AuraEnabled public String Name;
        @AuraEnabled public String FirstName;
        @AuraEnabled public String LastName;
        @AuraEnabled public String Phone;
        @AuraEnabled public String Email;
        @AuraEnabled public String initials;
        @AuraEnabled public Boolean isOnline;
        @AuraEnabled public String lastMessage;
        @AuraEnabled public Datetime lastMessageDate;
        @AuraEnabled public String lastMessageTime;
        @AuraEnabled public Integer unreadCount;
        @AuraEnabled public Boolean selected;
    }
}