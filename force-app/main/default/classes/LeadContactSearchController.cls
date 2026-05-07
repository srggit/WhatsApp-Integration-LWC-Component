public with sharing class LeadContactSearchController {
    public class SearchResult {
        @AuraEnabled public String recordType;
        @AuraEnabled public String name;
        @AuraEnabled public String email;
        @AuraEnabled public String phone;
        @AuraEnabled public String accountName; // this is for Contact 
        @AuraEnabled public String leadStatus;  // this is for Lead
        @AuraEnabled public Id recordId;
    }

    @AuraEnabled(cacheable=true)
    public static List<SearchResult> searchByEmail(String email) {
        List<SearchResult> results = new List<SearchResult>();

        List<Contact> contacts = [
            SELECT Id, Name, Email, Phone, Account.Name
            FROM Contact
            WHERE Email = :email
        ];
        for (Contact c : contacts) {
            SearchResult r = new SearchResult();
            r.recordType = 'Contact';
            r.name = c.Name;
            r.email = c.Email;
            r.phone = c.Phone;
            r.accountName = c.Account != null ? c.Account.Name : null;
            r.recordId = c.Id;
            results.add(r);
        }

        List<Lead> leads = [
            SELECT Id, Name, Email, Phone, Status
            FROM Lead
            WHERE Email = :email
        ];
        for (Lead l : leads) {
            SearchResult r = new SearchResult();
            r.recordType = 'Lead';
            r.name = l.Name;
            r.email = l.Email;
            r.phone = l.Phone;
            r.leadStatus = l.Status;
            r.recordId = l.Id;
            results.add(r);
        }

        return results;
    }

    @AuraEnabled
    public static Id createLead(Lead newLead) {
        insert newLead;
        return newLead.Id;
    }

    
}