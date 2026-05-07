public class AccountManagerController {
    public List<Account> accounts { get; set; }
    public String accountsJSON { get; set; }

    // Constructor: Fetch accounts initially
    public AccountManagerController() {
        accounts = [SELECT Id, Name,Email__c FROM Account ORDER BY CreatedDate DESC ];
        accountsJSON = JSON.serialize(accounts);
    }

    // Create new Account (RemoteAction for JS/AJAX)
    @RemoteAction
    public static Account createAccount(String name, String email) {
        Account acc = new Account(Name=name, Email__c=email);
        insert acc;
        return acc;
    }

    // Update existing Account
    @RemoteAction
    public static Account updateAccount(Id accountId, String newName,String newEmail) {
        Account acc = [SELECT Id, Name, Email__c FROM Account WHERE Id = :accountId LIMIT 1];
        acc.Name = newName;
        acc.Email__c=newEmail;
        update acc;
        return acc;
    }

    // Delete Account
    @RemoteAction
    public static Boolean deleteAccount(Id accountId) {
        Account acc = [SELECT Id FROM Account WHERE Id = :accountId LIMIT 1];
        delete acc;
        return true;
    }

    // Fetch all accounts
    @RemoteAction
    public static List<Account> getAccounts() {
        return [SELECT Id, Name FROM Account  ORDER BY CreatedDate LIMIT 50];
    }
}