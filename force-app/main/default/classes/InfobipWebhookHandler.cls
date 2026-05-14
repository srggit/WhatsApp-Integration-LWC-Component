@RestResource(urlMapping='/infobip/webhook')
global without sharing class InfobipWebhookHandler {

    @HttpPost
    global static void handleIncomingMessage() {

        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        try {
            String requestBody = req.requestBody.toString();
            System.debug('Incoming Payload: ' + requestBody);

            // Use untyped parsing (avoids reserved keyword issues)
            Map<String, Object> payload = (Map<String, Object>) JSON.deserializeUntyped(requestBody);

            List<Object> results = (List<Object>) payload.get('results');

            List<WhatsApp_Messages__c> recordsToInsert = new List<WhatsApp_Messages__c>();

            for (Object obj : results) {

                Map<String, Object> result = (Map<String, Object>) obj;
            
                String messageId = (String) result.get('messageId');
            
                // Find existing record
                List<WhatsApp_Messages__c> existingMessages = [
                    SELECT Id,
                        Message_Delivery_Status__c,
                        Delivered_At__c,
                        Read_At__c,
                        Messaging_Product__c,
                        Received_At__c
                    FROM WhatsApp_Messages__c
                    WHERE Message_Id__c = :messageId
                    LIMIT 1
                ];
            
                // =====================================================
                // UPDATE EXISTING OUTBOUND MESSAGE
                // =====================================================
            
                if (!existingMessages.isEmpty()) {
            
                    WhatsApp_Messages__c existingMsg = existingMessages[0];
            
                    // Delivery Status
                    if (result.containsKey('status')) {
            
                        Map<String, Object> statusMap =
                            (Map<String, Object>) result.get('status');
            
                        existingMsg.Message_Delivery_Status__c =
                            (String) statusMap.get('name');
                    }
            
                    // Sent Time
                    if (result.containsKey('sentAt')) {
            
                        existingMsg.Delivered_At__c =
                            parseDateTime((String) result.get('sentAt'));
                    }
            
                    // Seen Time
                    if (result.containsKey('seenAt')) {
            
                        existingMsg.Read_At__c =
                            parseDateTime((String) result.get('seenAt'));
            
                        existingMsg.Message_Delivery_Status__c = 'SEEN';
                    }
            
                    // Channel
                    if (result.containsKey('channel')) {
            
                        existingMsg.Messaging_Product__c =
                            (String) result.get('channel');
                    }
            
                    update existingMsg;
            
                    continue;
                }
            
                // =====================================================
                // INSERT ONLY FOR NEW INBOUND CUSTOMER MESSAGES
                // =====================================================
            
                WhatsApp_Messages__c msg = new WhatsApp_Messages__c();
            
                msg.Phone__c = (String) result.get('from');
                msg.Message_From__c = (String) result.get('from');
                msg.Messaged_To__c = (String) result.get('to');
            
                if (result.containsKey('message')) {
            
                    Map<String, Object> message =
                        (Map<String, Object>) result.get('message');
            
                    msg.Message_Text__c = (String) message.get('text');
                }
            
                if (result.containsKey('contact')) {
            
                    Map<String, Object> contact =
                        (Map<String, Object>) result.get('contact');
            
                    msg.Customer_Name__c = (String) contact.get('name');
                }
            
                msg.Message_Id__c = messageId;
            
                if (result.containsKey('receivedAt')) {
            
                    msg.Received_At__c =
                        parseDateTime((String) result.get('receivedAt'));
            
                } else {
            
                    msg.Received_At__c = System.now();
                }
            
                msg.Direction__c = 'Inbound';
            
                recordsToInsert.add(msg);
            
                // Platform Event
                WhatsApp_Message_Event__e eventMsg = new WhatsApp_Message_Event__e(
                    Phone__c = msg.Phone__c,
                    Message__c = msg.Message_Text__c,
                    Direction__c = msg.Direction__c
                );
                EventBus.publish(eventMsg);
                
            }

            if (!recordsToInsert.isEmpty()) {
                insert recordsToInsert;
            }

            res.statusCode = 200;
            res.responseBody = Blob.valueOf('SUCCESS');

        } catch (Exception e) {

            System.debug('Error: ' + e.getMessage());

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

    /*
    @HttpPost
    global static void handleIncomingMessage() {

        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        try {
            String requestBody = req.requestBody.toString();
            System.debug('Incoming Payload: ' + requestBody);

            // Use untyped parsing (avoids reserved keyword issues)
            Map<String, Object> payload = (Map<String, Object>) JSON.deserializeUntyped(requestBody);

            List<Object> results = (List<Object>) payload.get('results');

            List<WhatsApp_Messages__c> recordsToInsert = new List<WhatsApp_Messages__c>();

            for (Object obj : results) {

                Map<String, Object> result = (Map<String, Object>) obj;

                WhatsApp_Messages__c msg = new WhatsApp_Messages__c();

                // FIX: safely get 'from' and 'to'
                msg.Phone__c = (String) result.get('from');
                msg.Message_From__c = (String) result.get('from');
                msg.Messaged_To__c = (String) result.get('to');

                // Message
                if (result.containsKey('message')) {
                    Map<String, Object> message = (Map<String, Object>) result.get('message');
                    msg.Message_Text__c = (String) message.get('text');
                }

                // Contact name
                if (result.containsKey('contact')) {
                    Map<String, Object> contact = (Map<String, Object>) result.get('contact');
                    msg.Customer_Name__c = (String) contact.get('name');
                }

                // Message ID
                msg.Message_Id__c = (String) result.get('messageId');

                // Date
                if (result.containsKey('receivedAt')) {
                    msg.Received_At__c = parseDateTime((String) result.get('receivedAt'));
                } else {
                    msg.Received_At__c = System.now();
                }

                msg.Direction__c = 'Inbound';

                recordsToInsert.add(msg);

                // Publish Event and Subscribe on LWC
                WhatsApp_Message_Event__e eventMsg = new WhatsApp_Message_Event__e(
                    Phone__c = msg.Phone__c,
                    Message__c = msg.Message_Text__c,
                    Direction__c = msg.Direction__c
                );

                EventBus.publish(eventMsg);
            }

            if (!recordsToInsert.isEmpty()) {
                insert recordsToInsert;
            }

            res.statusCode = 200;
            res.responseBody = Blob.valueOf('SUCCESS');

        } catch (Exception e) {

            System.debug('Error: ' + e.getMessage());

            res.statusCode = 500;
            res.responseBody = Blob.valueOf('ERROR: ' + e.getMessage());
        }
    }
    */
}