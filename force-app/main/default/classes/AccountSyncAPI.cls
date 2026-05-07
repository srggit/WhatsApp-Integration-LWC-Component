@RestResource(urlMapping='/accountSync/*')
global with sharing class AccountSyncAPI {
    
    @HttpPost
    global static String createAccount(String name, String phone, String industry) {
        Account acc = new Account();
        acc.Name = name;
        acc.Phone = phone;
        acc.Industry = industry;
        insert acc;
        
        return 'Account created successfully with Id: ' + acc.Id;
    }
}