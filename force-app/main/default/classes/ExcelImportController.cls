public with sharing class ExcelImportController {
    @AuraEnabled
    public static void importExcelData(List<Map<String, Object>> accounts, List<Map<String, Object>> contacts) {
        Map<String, Id> accountNameToId = new Map<String, Id>();
        List<Account> accountList = new List<Account>();

        // Prepare Account records
        for (Map<String, Object> row : accounts) {
            String name = String.valueOf(row.get('Name'));
            if (String.isBlank(name)) continue;

            Account acc = new Account();
            acc.Name = name;
            acc.Phone = String.valueOf(row.get('Phone'));
            acc.Industry = String.valueOf(row.get('Industry'));
            accountList.add(acc);
        }

        try {
            if (!accountList.isEmpty()) {
                insert accountList;
                for (Account acc : accountList) {
                    accountNameToId.put(acc.Name, acc.Id);
                }
            }
        } catch (DmlException e) {
            throw new AuraHandledException('Failed to insert Accounts: ' + e.getMessage());
        }

        // Prepare Contact records
        List<Contact> contactList = new List<Contact>();
        for (Map<String, Object> row : contacts) {
            String accountName = String.valueOf(row.get('Account_Name'));
            if (!accountNameToId.containsKey(accountName)) continue;

            String lastName = String.valueOf(row.get('LastName'));
            if (String.isBlank(lastName)) continue; // Required field in Contact

            Contact con = new Contact();
            con.FirstName = String.valueOf(row.get('FirstName'));
            con.LastName = lastName;
            con.Email = String.valueOf(row.get('Email'));
            con.AccountId = accountNameToId.get(accountName);
            contactList.add(con);
        }

        try {
            if (!contactList.isEmpty()) {
                insert contactList;
            }
        } catch (DmlException e) {
            throw new AuraHandledException('Failed to insert Contacts: ' + e.getMessage());
        }
    }
}