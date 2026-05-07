@isTest
public class TestUtils {
    public static User createUser(String email, String aliasName) {
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        User u = new User(
            FirstName = 'Test',
            LastName = aliasName,
            Alias = aliasName.length() > 8 ? aliasName.substring(0, 8) : aliasName,
            Email = email,
            Username = email,
            ProfileId = p.Id,
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US'
        );
        insert u;
        return u;
    }
}