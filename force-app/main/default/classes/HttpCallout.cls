public with sharing class HttpCallout {
    public static void getAccountFromOtherOrg(){
            Http h = new Http();
            HttpRequest req = new HttpRequest();
            req.setEndpoint('callout:Callout/services/data/v60.0/query/?q=SELECT+Id%2C+Name+FROM+Account+WHERE+Name+%3D+%27Account1%27');
            req.setMethod('GET');
            HttpResponse res = h.send(req);
        	 if (res.getStatusCode() == 200) {
                Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
                List<Object> records = (List<Object>) result.get('records');
                List<Account> newAccounts = new List<Account>();
                for (Object rec : records) {
                    Map<String, Object> acct = (Map<String, Object>) rec;
                    newAccounts.add(new Account(Name = (String) acct.get('Name')));
                }
                insert newAccounts;
        	} 
        	else {
                System.debug('Callout failed: ' + res.getStatus());
                System.debug('Body: ' + res.getBody());
            }
    }
}