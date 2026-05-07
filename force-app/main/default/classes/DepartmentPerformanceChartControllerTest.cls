@istest
public class DepartmentPerformanceChartControllerTest {
	@isTest
    static void testDepartmentPerformanceChartController(){
        Department__c dept = new Department__c(Name='developer');
        insert dept;
        
        Yearly_Budget__c yb = new Yearly_Budget__c(Name='Budget 2025-26', Budget_Amount__c=1000);
        insert yb;
        
        Departmental_Budget__c deptBudget = new Departmental_Budget__c(
            Name='Budget 2025-26',
            Department_Budget_Amount__c= 1000,
            Utilized_Budget__c = 1000,
            Department__c = dept.Id,
            Yearly_Budget__c = yb.Id
        );
        insert deptBudget;
        
        DepartmentPerformanceChartController.getDepartmentalPerformance(yb.Id);
        
	}
    
    
}