/*
 * ============================================================
 * META WEBHOOK HANDLER
 * ============================================================
 * This class is used to handle the incoming webhook from Meta.
 * It is used to verify the webhook and to handle the incoming message from Meta.
 * It is also used to handle the incoming message status from Meta.
 * It is also used to handle the outgoing message to Meta.
 * It is also used to handle the outgoing message status to Meta.
 */
@RestResource(urlMapping='/meta/webhook')
global without sharing class MetaWebhookHandler {

    /*
     * ============================================================
     * META WEBHOOK VERIFICATION (GET)
     * ============================================================
     * Meta sends a GET request with:
     * - hub.mode
     * - hub.verify_token
     * - hub.challenge
     *
     * We must:
     * 1. Match verify_token
     * 2. Return hub.challenge as response
     */
    
    @HttpGet
    global static void verifyWebhook() {

        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        try {
            // Get query params from Meta request
            String mode = req.params.get('hub.mode');
            String verifyToken = req.params.get('hub.verify_token');
            String challenge = req.params.get('hub.challenge');

            System.debug('Webhook Verification Request: ' + req.params);

            // IMPORTANT: This must match what you enter in Meta UI
            String expectedToken = 'myWebhook123';

            // Validate token
            if (mode == 'subscribe' && verifyToken == expectedToken) {
                // Return challenge back to Meta
                res.responseBody = Blob.valueOf(challenge);
                res.statusCode = 200;

                System.debug('Webhook verified successfully');
            } else {
                res.statusCode = 403;
                res.responseBody = Blob.valueOf('Invalid verification token');

                System.debug('Webhook verification failed');
            }

        } catch (Exception e) {
            System.debug('Verification Error: ' + e.getMessage());

            res.statusCode = 500;
            res.responseBody = Blob.valueOf('ERROR: ' + e.getMessage());
        }
    }

    /*
     * ============================================================
     * INBOUND MESSAGE HANDLER (POST - META)
     * ============================================================
     */
    @HttpPost
    global static void handleIncomingMessage() {
        
        Savepoint sp = Database.setSavepoint();

        // Get request and response
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
    
        try {
            // Get request body
            String requestBody = req.requestBody.toString();
            System.debug('META Incoming Payload: ' + requestBody);
    
            Map<String, Object> payload = (Map<String, Object>) JSON.deserializeUntyped(requestBody);
            
            if (!payload.containsKey('entry')) {
                throw new AuraHandledException('Invalid payload structure');
            }
            
            List<Object> entries = (List<Object>) payload.get('entry');
    
            List<WhatsApp_Messages__c> recordsToInsert = new List<WhatsApp_Messages__c>();
    
            for (Object entryObj : entries) {
                Map<String, Object> entry = (Map<String, Object>) entryObj;
    
                List<Object> changes = (List<Object>) entry.get('changes');
    
                for (Object changeObj : changes) {
                    Map<String, Object> change = (Map<String, Object>) changeObj;
    
                    Map<String, Object> value = (Map<String, Object>) change.get('value');
    
                    // Extract metadata
                    Map<String, Object> metadata = (Map<String, Object>) value.get('metadata');
    
                    String displayPhone = (String) metadata.get('display_phone_number');
                    String phoneNumberId = (String) metadata.get('phone_number_id');
                    String messagingProduct = (String) metadata.get('messaging_product');
    
                    // Extract contact info
                    String waId;
                    String customerName;
                    String userId;
    
                    if (value.containsKey('contacts')) {
                        List<Object> contacts = (List<Object>) value.get('contacts');
    
                        if (!contacts.isEmpty()) {
                            Map<String, Object> contact = (Map<String, Object>) contacts[0];
    
                            waId = (String) contact.get('wa_id');
                            userId = (String) contact.get('user_id');
    
                            if (contact.containsKey('profile')) {
                                Map<String, Object> profile = (Map<String, Object>) contact.get('profile');
                                customerName = (String) profile.get('name');
                            }
                        }
                    }
    
                    // ============================= INCOMING MESSAGE FROM CUSTOMER: HANDLE MESSAGE =============================
                    
                    //List<WhatsApp_Message_Event__e> eventsToPublish = new List<WhatsApp_Message_Event__e>();
                    List<WhatsApp_Message_Event__e> messageEvents = new List<WhatsApp_Message_Event__e>();
                    List<WhatsApp_Message_Event__e> statusEvents = new List<WhatsApp_Message_Event__e>();

                    if (value.containsKey('messages')) {

                        List<Object> messages = (List<Object>) value.get('messages');

                        System.debug('messages ==> ' + messages);

                        for (Object msgObj : messages) {
    
                            Map<String, Object> message = (Map<String, Object>) msgObj;
    
                            WhatsApp_Messages__c msg = new WhatsApp_Messages__c();
    
                            msg.Phone__c = (String) message.get('from');
                            msg.Message_From__c = (String) message.get('from');
    
                            // Message ID
                            msg.Message_Id__c = (String) message.get('id');
    
                            // wa_id
                            msg.WhatsApp_Id__c = waId;
    
                            // Customer Name
                            msg.Customer_Name__c = customerName;
    
                            // User ID
                            msg.User_Id__c = userId;
    
                            // Message Type
                            msg.Message_Type__c = (String) message.get('type');
    
                            // Text
                            if (message.containsKey('text')) {
                                Map<String, Object> text = (Map<String, Object>) message.get('text');
                                msg.Message_Text__c = (String) text.get('body');
                            }
    
                            // Timestamp
                            if (message.containsKey('timestamp')) {
                                String ts = (String) message.get('timestamp');
                                Long epoch = Long.valueOf(ts) * 1000;
                                msg.Received_At__c = Datetime.newInstance(epoch);
                            } else {
                                msg.Received_At__c = System.now();
                            }
    
                            // Metadata fields
                            msg.Messaged_To__c = displayPhone;
                            msg.Phone_Number_Id__c = phoneNumberId;
                            msg.Messaging_Product__c = messagingProduct;
    
                            msg.Direction__c = 'Inbound';
    
                            recordsToInsert.add(msg);
    
                            // Publish Event for LWC
                            WhatsApp_Message_Event__e eventMsg = new WhatsApp_Message_Event__e(
                                Phone__c = msg.Phone__c,
                                Message__c = msg.Message_Text__c,
                                Direction__c = msg.Direction__c,
                                WhatsApp_Delivery_Status__c = msg.Message_Delivery_Status__c,
                                Message_Id__c = msg.Message_Id__c,
                                Message_Created_Date__c = msg.Received_At__c
                                // Message_Created_Date__c = msg.CreatedDate // Here we cannot use createdDate because, WhatsApp Message is not yet inserted in Database.
                            );
    
                            messageEvents.add(eventMsg);
    
                            System.debug('META msg ==> ' + msg);
                        }
                    }

                    if (!recordsToInsert.isEmpty()) {
                        Database.SaveResult[] results = Database.insert(recordsToInsert, false);
                    
                        for (Database.SaveResult sr : results) {
                            if (!sr.isSuccess()) {
                                throw new AuraHandledException(sr.getErrors()[0].getMessage());
                            }
                        }
                    
                        // publish event only after success
                        for (WhatsApp_Message_Event__e evt : messageEvents) {
                            EventBus.publish(evt);
                        }
                    }
                    
                    // We inserted the message in WhatsAppController.cls and now when we get the status update from Meta, we need to update the message in our Salesforce database.
                    // ============================= UPDATING MESSAGE STATUS: HANDLE MESSAGE STATUS =============================
                    if (value.containsKey('statuses')) {

                        List<Object> statuses = (List<Object>) value.get('statuses');
                    
                        List<WhatsApp_Messages__c> recordsToUpdate = new List<WhatsApp_Messages__c>();
                    
                        // =========================
                        // STEP 1: Collect Message IDs
                        // =========================
                        Set<String> messageIds = new Set<String>();
                    
                        for (Object statusObj : statuses) {
                            Map<String, Object> statusMap = (Map<String, Object>) statusObj;
                    
                            String messageId = (String) statusMap.get('id');
                    
                            if (messageId != null) {
                                messageIds.add(messageId);
                            }
                        }
                    
                        // =========================
                        // STEP 2: Query once
                        // =========================
                        Map<String, WhatsApp_Messages__c> messageMap = new Map<String, WhatsApp_Messages__c>();
                    
                        if (!messageIds.isEmpty()) {
                            for (WhatsApp_Messages__c msg : [
                                SELECT Id, Message_Delivery_Status__c, Delivered_At__c, Read_At__c,
                                       Phone__c, WhatsApp_Id__c, Direction__c,
                                       Phone_Number_Id__c, User_Id__c, Message_From__c,
                                       Messaged_To__c, Message_Text__c, Message_Id__c, CreatedDate
                                FROM WhatsApp_Messages__c
                                WHERE Message_Id__c IN :messageIds
                            ]) {
                                messageMap.put(msg.Message_Id__c, msg);
                            }
                        }
                    
                        // =========================
                        // STEP 3: Process statuses
                        // =========================
                        for (Object statusObj : statuses) {
                    
                            Map<String, Object> statusMap = (Map<String, Object>) statusObj;
                    
                            String messageId = (String) statusMap.get('id');
                            String status = (String) statusMap.get('status');
                    
                            System.debug('Status Update ==> ' + status + ' for ' + messageId);
                    
                            if (!messageMap.containsKey(messageId)) {
                                System.debug('Message not found for ID: ' + messageId);
                                continue;
                            }
                    
                            WhatsApp_Messages__c msg = messageMap.get(messageId);
                    
                            // UPDATE STATUS
                            msg.Message_Delivery_Status__c = status;
                            msg.Phone_Number_Id__c = phoneNumberId;
                            msg.User_Id__c = userId;
                    
                            // DO NOT overwrite sender (this was wrong earlier)
                            // msg.Message_From__c = displayPhone;
                    
                            String ts = (String) statusMap.get('timestamp');
                    
                            if (ts != null) {
                                Long epochMillis = Long.valueOf(ts) * 1000;
                                Datetime statusTime = Datetime.newInstance(epochMillis);
                    
                                if (status == 'delivered') {
                                    msg.Delivered_At__c = statusTime;
                                }
                                if (status == 'read') {
                                    msg.Read_At__c = statusTime;
                                }
                            }
                    
                            recordsToUpdate.add(msg);
                    
                            // Prepare event
                            WhatsApp_Message_Event__e eventMsg = new WhatsApp_Message_Event__e(
                                Phone__c = msg.Phone__c,
                                Message__c = msg.Message_Text__c,
                                Direction__c = msg.Direction__c,
                                WhatsApp_Delivery_Status__c = msg.Message_Delivery_Status__c,
                                Message_Id__c = msg.Message_Id__c,
                                Message_Created_Date__c = msg.CreatedDate
                            );
                    
                            statusEvents.add(eventMsg);
                        }
                    
                        // =========================
                        // STEP 4: DML + Event
                        // =========================
                        if (!recordsToUpdate.isEmpty()) {
                    
                            Database.SaveResult[] results = Database.update(recordsToUpdate, false);
                    
                            for (Database.SaveResult sr : results) {
                                if (!sr.isSuccess()) {
                                    throw new AuraHandledException(sr.getErrors()[0].getMessage());
                                }
                            }
                    
                            // Publish only after success
                            for (WhatsApp_Message_Event__e evt : statusEvents) {
                                EventBus.publish(evt);
                            }
                        }
                    }
                    /*
                    if (value.containsKey('statuses')) {

                        List<Object> statuses = (List<Object>) value.get('statuses');

                        List<WhatsApp_Messages__c> recordsToUpdate = new List<WhatsApp_Messages__c>();

                        for (Object statusObj : statuses) {

                            Map<String, Object> statusMap = (Map<String, Object>) statusObj;

                            String messageId = (String) statusMap.get('id');
                            String status = (String) statusMap.get('status');
                            String recipient = (String) statusMap.get('recipient_id');

                            System.debug('Status Update ==> ' + status + ' for ' + messageId);

                            // FIND EXISTING MESSAGE
                            List<WhatsApp_Messages__c> existingMsgs = [
                                SELECT Id, Message_Delivery_Status__c, Delivered_At__c, Read_At__c, Phone__c, WhatsApp_Id__c, Direction__c,
                                Phone_Number_Id__c, User_Id__c, Message_From__c, Messaged_To__c, Message_Text__c, Message_Id__c
                                FROM WhatsApp_Messages__c
                                WHERE Message_Id__c = :messageId
                                LIMIT 1
                            ];
                            System.debug('existingMsgs ==> ' + existingMsgs);

                            if (!existingMsgs.isEmpty()) {

                                System.debug('existingMsgs found ==> ' + existingMsgs);

                                WhatsApp_Messages__c msg = existingMsgs[0];
                                System.debug('msg ==> ' + msg);

                                // UPDATE STATUS
                                msg.Message_Delivery_Status__c = status;
                                msg.Phone_Number_Id__c = phoneNumberId;
                                msg.User_Id__c = userId;
                                msg.Message_From__c = displayPhone;

                                String ts = (String) statusMap.get('timestamp');

                                if (ts != null) {
                                    Long epochMillis = Long.valueOf(ts) * 1000;
                                    Datetime statusTime = Datetime.newInstance(epochMillis);

                                    if (status == 'delivered') {
                                        msg.Delivered_At__c = statusTime;
                                    }
                                    if (status == 'read') {
                                        msg.Read_At__c = statusTime;
                                    }
                                }

                                recordsToUpdate.add(msg);

                                //Publish Event for LWC
                                WhatsApp_Message_Event__e eventMsg = new WhatsApp_Message_Event__e(
                                    Phone__c = msg.Phone__c,
                                    Message__c = msg.Message_Text__c,
                                    Direction__c = msg.Direction__c,
                                    WhatsApp_Delivery_Status__c = msg.Message_Delivery_Status__c,
                                    Message_Id__c = msg.Message_Id__c
                                );
                                statusEvents.add(eventMsg);

                                //EventBus.publish(eventMsg);
                            }
                        }

                        if (!recordsToUpdate.isEmpty()) {
                            Database.SaveResult[] results = Database.update(recordsToUpdate, false);
                    
                            for (Database.SaveResult sr : results) {
                                if (!sr.isSuccess()) {
                                    throw new AuraHandledException(sr.getErrors()[0].getMessage());
                                }
                            }

                            // publish event only after success
                            for (WhatsApp_Message_Event__e evt : statusEvents) {
                                EventBus.publish(evt);
                            }
                        }
                    }
                    */
                }
            }
    
            res.statusCode = 200;
            res.responseBody = Blob.valueOf('EVENT_RECEIVED');
    
        } catch (Exception e) {
    
            System.debug('META Error: ' + e.getMessage());

            Database.rollback(sp);
            System.debug('Database rolled back');

            res.statusCode = 500;
            res.responseBody = Blob.valueOf('ERROR: ' + e.getMessage());
        }
    }

    // Helper method
    private static Datetime parseDateTime(String dt) {
        try {
            return Datetime.valueOfGmt(dt.replace('T', ' ').substring(0, 19));
        } catch (Exception e) {
            return System.now();
        }
    }
}