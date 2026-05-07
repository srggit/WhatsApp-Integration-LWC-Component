public class GetPostHttpHelper {
    
    private static GetPostHttpHelper thisInstance;
    private GetPostHttpHelper(){}
    
    Public Static GetPostHttpHelper getInstance(){
        if(thisInstance == null)
            thisInstance = new GetPostHttpHelper();
        return thisInstance;
    }
    
    public string getAllPosts(){
        
        HttpRequest request = new HttpRequest();
        request.setEndpoint('https://dummyjson.com/posts');
        request.setMethod('GET');
        
        Http httpInstance = new Http();
        HttpResponse result = httpInstance.send(request);
        
        System.debug(result.getBody());
        
        return null;
    }
    
    
    public void  createPost(String postJsonString){
        
        if(String.isBlank(postJsonString))
            return;
        
        HttpRequest request = new HttpRequest();
        request.setEndpoint('https://dummyjson.com/posts/add');
        request.setHeader('Content-Type','application/json');
        request.setMethod('POST');
        request.setBody(postJsonString);
        
        Http httpInstance = new Http();
        HttpResponse result = httpInstance.send(request);
        
        System.debug(result.getBody());
        System.debug(result.getStatusCode());
        
       
    }
    
    
    
}