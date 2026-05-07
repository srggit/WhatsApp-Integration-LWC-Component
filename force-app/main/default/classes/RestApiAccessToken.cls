public class RestApiAccessToken {
    public static void getAccessToken(){
        /*
        String endpoint='https://login.salesforce.com/services/oauth2/token';
        
        String username = ' ushaugar@gmail'; 
        String password = 'Usha@12345' + 'rLZV36Ah0TzONexfhvXX64oL';
        String ClientId= '3MVG9WVXk15qiz1Le7GbJNg3jtTMln7Xcl1eCcTgMIl8232FbGxnEIA6Huvs8wMcROeDJO8yak_Y.Kwn1H55R';
        String ClientSecret = 'DCCC0663D3B4F703154A384944ACFF390A471FEAC929B01494B93C44BE817D51'; 
        String loginUrl     = 'https://login.salesforce.com/';
        */
        /*Httprequest req = new HttpRequest();    
        req.setMethod('POST');    
        //req.setHeader('Content-Type','application/json');
        
        req.setBody('grant_type=password + &client_id=' + ClientId + '&client_secret=' + ClientSecret + '&username=' + username +'&password=' + password); 
        
        req.setEndpoint(endpoint);
        //req.setHeader('Authorization', 'OAuth '+UserInfo.getSessionId());
        Http http = new Http();
        HttpResponse res;       
        String Access_Token;
        try {
            res = http.send(req);                
            system.debug('body:'+res.getBody());  
            JSONParser parser = JSON.createParser(res.getBody());
            while (parser.nextToken() != null) {
                if ((parser.getCurrentToken() == JSONToken.FIELD_NAME) && (parser.getText() == 'access_token')) {
                    parser.nextToken();
                    Access_Token = parser.getText(); 
                    System.debug('Access Token is======>' +Access_Token);
                } 
            }            
        }catch(system.CalloutException e){            
            system.debug('error'+e);
        }
        system.debug('access token'+Access_Token);
        Httprequest req1 = new HttpRequest();  
        req1.setEndpoint('https://orgfarm-5884093f64-dev-ed.develop.my.salesforce.com/services/apexrest/v1/getAccounts');  
                         req1.setMethod('GET');    
                         req1.setHeader('Content-Type','application/x-www-form-urlencoded');
                         req1.setHeader('Authorization','Bearer '+Access_Token);            
                         Http http1 = new Http();
                         HttpResponse res1 = http1.send(req1);                 
                         system.debug('body11:'+res1.getBody()); 
                         return res1.getBody();
         }*/
     
		// --- Build OAuth token request --- //
        /*

        HttpRequest req = new HttpRequest();
        req.setEndpoint(loginUrl + '/services/oauth2/token');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/x-www-form-urlencoded');

        String body = 'grant_type=password'
                    + '&client_id=' + EncodingUtil.urlEncode(clientId, 'UTF-8')
                    + '&client_secret=' + EncodingUtil.urlEncode(clientSecret, 'UTF-8')
                    + '&username=' + EncodingUtil.urlEncode(username, 'UTF-8')
                    + '&password=' + EncodingUtil.urlEncode(password, 'UTF-8');

        req.setBody(body);

         Http http = new Http();
        HTTPResponse res = http.send(req);
        
        System.debug('Response: ' + res.getBody());
        
        if(res.getStatusCode() == 200) {
            Map<String, Object> results = (Map<String, Object>)JSON.deserializeUntyped(res.getBody());
            System.debug('Access Token: ' + results.get('access_token'));
        } else {
            System.debug('Failed: ' + res.getStatus());
        }
        */
    }
        
}