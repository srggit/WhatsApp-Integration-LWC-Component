public with sharing class OrgAOrderFetcher {
	/*@AuraEnabled(cacheable=false)
    public static List<Order> fetchOrdersFromOrgA(Id accountId){
        List<Order> orderList = new List<Order>();
        try{
            String query = 'SELECT Id, Name,Status,EffectiveDate,TotalAmount From Order WHERE AccountId = \'' + accountId + '\'';
            String endpoint= 'callout:Credentials/services/data/v61.0/query/?q=' +EncodingUtil.urlEncode(query, 'UTF-8');
            HttpRequest req = new HttpRequest();
            req.setEndpoint(endpoint);
            req.setMethod('GET');
            req.setHeader('Content-Type' , 'application/json');
            Http http = new Http();
            HttpResponse res = http.send(req);
            System.debug('Response Status: ' + res.getStatus());
            System.debug('Body: ' + res.getBody());
            if(res.getStatusCode() == 200){
                Map<String,Object> jsonMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
				List<Object> records =  (List<Object>) jsonMap.get('records');         
            	for (Object recObj : records) {
                    Map<String, Object> rec = (Map<String, Object>) recObj;
                    Order ord = new Order();
                    ord.Name = (String) rec.get('Name');
                    
                    ord.Status = (String) rec.get('Status');
                    ord.EffectiveDate = Date.valueOf(((String)rec.get('EffectiveDate')).substring(0,10));
                    //ord.TotalAmount = rec.get('TotalAmount') != null ? Decimal.valueOf(String.valueOf(rec.get('TotalAmount'))) : null;
                    orderList.add(ord);
                }
        }
            
	     }
    catch (Exception e) {
            System.debug('Error fetching Orders: ' + e.getMessage());
        }
    return orderList;
    }*/
    // DTO Classes

    // ------------------------------
    public class AccountDTO {
        @AuraEnabled public String Id;
        @AuraEnabled public String Name;
    }

    public class OrderDTO {
        @AuraEnabled public String Name;
        @AuraEnabled public String OrderNumber;
        @AuraEnabled public String Status;
        @AuraEnabled public String EffectiveDate;
        @AuraEnabled public Decimal TotalAmount;
    }

    // ------------------------------
    // Fetch all Accounts from Org A
    // ------------------------------
    @AuraEnabled(cacheable=false)
    public static List<AccountDTO> fetchAccountsFromOrgA() {
        List<AccountDTO> accounts = new List<AccountDTO>();
        try {
            String query = 'SELECT Id, Name FROM Account LIMIT 100';
            String endpoint = 'callout:Credentials/services/data/v61.0/query/?q=' +
                              EncodingUtil.urlEncode(query, 'UTF-8');

            HttpRequest req = new HttpRequest();
            req.setEndpoint(endpoint);
            req.setMethod('GET');
            req.setHeader('Content-Type', 'application/json');

            Http http = new Http();
            HttpResponse res = http.send(req);

            if (res.getStatusCode() == 200) {
                Map<String, Object> jsonMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
                List<Object> records = (List<Object>) jsonMap.get('records');

                for (Object obj : records) {
                    Map<String, Object> rec = (Map<String, Object>) obj;
                    AccountDTO acc = new AccountDTO();
                    acc.Id = (String) rec.get('Id');
                    acc.Name = (String) rec.get('Name');
                    accounts.add(acc);
                }
            } else {
                System.debug('Account fetch failed: ' + res.getBody());
            }
        } catch (Exception e) {
            System.debug('Error fetching accounts: ' + e.getMessage());
        }
        return accounts;
    }

    // ------------------------------
    // Fetch Orders for selected Account
    // ------------------------------
    @AuraEnabled(cacheable=false)
    public static List<OrderDTO> fetchOrdersFromOrgA(Id accountId) {
        List<OrderDTO> orderList = new List<OrderDTO>();
        try {
            String query = 'SELECT Id, Name, OrderNumber,Status, EffectiveDate, TotalAmount FROM Order WHERE AccountId = \'' + accountId + '\'';
            String endpoint = 'callout:Credentials/services/data/v61.0/query/?q=' +
                              EncodingUtil.urlEncode(query, 'UTF-8');

            HttpRequest req = new HttpRequest();
            req.setEndpoint(endpoint);
            req.setMethod('GET');
            req.setHeader('Content-Type', 'application/json');

            Http http = new Http();
            HttpResponse res = http.send(req);

            if (res.getStatusCode() == 200) {
                Map<String, Object> jsonMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
                List<Object> records = (List<Object>) jsonMap.get('records');

                for (Object obj : records) {
                    Map<String, Object> rec = (Map<String, Object>) obj;
                    OrderDTO ord = new OrderDTO();
                    ord.Name = (String) rec.get('Name');
                    if (rec.get('OrderNumber') != null)
    					ord.OrderNumber = String.valueOf(rec.get('OrderNumber'));
                    ord.Status = (String) rec.get('Status');
                    if (rec.get('EffectiveDate') != null)
                        ord.EffectiveDate = String.valueOf(rec.get('EffectiveDate')).substring(0,10);
                    if (rec.get('TotalAmount') != null)
                        ord.TotalAmount = Decimal.valueOf(String.valueOf(rec.get('TotalAmount')));
                    orderList.add(ord);
                }
            } else {
                System.debug('Order fetch failed: ' + res.getBody());
            }
        } catch (Exception e) {
            System.debug('Error fetching orders: ' + e.getMessage());
        }
        return orderList;
    }
}