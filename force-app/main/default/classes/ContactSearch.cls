public class ContactSearch {
    public static List<Contact> searchForContacts(String lastName, String postalCode) {
        // Query to find contacts with matching last name and mailing postal code
        List<Contact> contacts = [SELECT Id, Name 
                                  FROM Contact 
                                  WHERE LastName = :lastName 
                                  AND MailingPostalCode = :postalCode];
        return contacts;
    }
}