@isTest
public class DepartmentChartControllerTest { 
    @isTest
    static void testgetDepartmentPerformanceChart(){
        Department__c dept=new Department__c(Name='IT');
        insert dept;
        
        Yearly_Budget__c yb = new Yearly_Budget__c(
        	Name='Yearly Budget 2024-25',
            Budget_Amount__c=1000
        );
        insert yb;
        
        Departmental_Budget__c deptBudget = new Departmental_Budget__c(
            Name='Budget 2024-25',
            Department_Budget_Amount__c = 1000,
            Department__c = dept.Id,
            Yearly_Budget__c = yb.Id
        );
        insert deptBudget;
        DepartmentChartController.getDepartmentPerformanceChart(yb.Id);
    }
}