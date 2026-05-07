public class AccountUtility {
    public static void viewAnnualRevenue() {
        // Query to get the name and annual revenue of all accounts
        List<Account> accountsList = [SELECT Name, AnnualRevenue FROM Account];
        
        // Iterate through each account and print the name and annual revenue to the debug log
        for (Account acc : accountsList) {
            String acctRev = acc.Name + ' : ' + acc.AnnualRevenue;
            System.debug(acctRev);
        }
    }
}