public with sharing class ContactRegistrationController {
    
    @RemoteAction
    public static String createContact(String firstName, String lastName, String phone, String email) {
        try {
            Contact con = new Contact(FirstName = firstName, LastName = lastName,Phone = phone,Email = email);
            insert con;
            return 'Contact created successfully for ' + con.FirstName;
        } catch(Exception e) {
            return 'Error: ' + e.getMessage();
        }
    }
}