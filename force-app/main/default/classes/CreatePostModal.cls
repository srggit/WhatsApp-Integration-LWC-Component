public class CreatePostModal {
  
		public list<String> tags{get;set;}
		public Reactions reactionInstance{get;set;}
		public String body{get;set;}
		public Integer views{get;set;}
		public String title{get;set;}
		public Integer userId{get;set;}
		public Integer id{get;set;}
	public class Reactions{
		public Integer likes{get;set;}
		public Integer dislikes{get;set;}
	}
}