@RestResource(urlmapping='/AccountContactApi')
global class AccountContactApi {
    @HttpPost
    global static void saveAccConFromExtSys(){
        //Initiate req and res objs
        RestRequest req = RestContext.Request;
        RestResponse res = RestContext.Response;
        //Parse your JSON body to your own 
        String body= req.requestBody.toString(); //{"CustomerNAme" : "Salesforce" , "isAccount" :true}
        MyJsonCls myObj =(MyJsonCls) JSON.deserialize( body , MyJsonCls.Class);
        System.debug('@@@@@@@@' +myObj.CustomerName+ '@' +myObj.isAccount);
        //logic
        if(myObj.isAccount == true){
            Account acc = new Account(Name=myObj.CustomerName);
            INSERT acc;
        }
        else if(myObj.isAccount == false){
            Contact con =new Contact(Lastname =myObj.CustomerName );
            INSERT Con;
        }
        
    }
}