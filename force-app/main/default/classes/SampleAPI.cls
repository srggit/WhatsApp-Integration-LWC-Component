@RestResource(urlMapping = '/testAPI')
global without sharing class SampleAPI {
    @HttpGet
    global static void responseMethod(){
        
        RestRequest req = RestContext.Request;
        RestResponse res = RestContext.Response;
        
         Map<String,Object> payLoad = new Map<String,Object>();
         Map<String,Object> data = new Map<String,Object>();
        data.put('message','working fine');
        payLoad.put('data',data);
        
        String slBody = JSON.serializePretty(payLoad);
        
        res.responseBody = Blob.valueOf(slBody);
        res.statuscode = 200;
             
    }

}