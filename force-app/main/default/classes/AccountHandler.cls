public class AccountHandler {
    public static Account insertNewAccount(String accountName) {
        try {
            // Create a new Account sObject
            Account newAccount = new Account(Name = accountName);
            
            // Insert the account using DML
            insert newAccount;
            
            // Return the inserted account record
            return newAccount;
        } catch (DmlException e) {
            // If a DML exception occurs, return null
            return null;
        }
    }
}