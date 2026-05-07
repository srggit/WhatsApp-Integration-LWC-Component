public with sharing class BookingFormController {
    @AuraEnabled(cacheable=true)
    public static String getTermsAndConditions() {
        Terms_and_Conditions__mdt record = [
            SELECT Id,Terms_Text__c 
            FROM Terms_and_Conditions__mdt 
            WHERE DeveloperName = 'Booking_Form_Terms'
            LIMIT 1
        ];
        return record.Terms_Text__c;
    }
}