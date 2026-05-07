@isTest
public class DepartmentalBudgetChartControllerTest {
	@testSetup
    static void SetupTestData(){
        Department__c dept=new Department__c(Name='IT');
        insert dept;
        
        Yearly_Budget__c yb = new Yearly_Budget__c(Name='FY 2024-25', Budget_Amount__c=1000);
        insert yb;
        
        Departmental_Budget__c parentBudget  = new Departmental_Budget__c(
            Name='DepartmentalBudget 2024-25',
            Department_Budget_Amount__c = 200,
            Department__c = dept.Id,
            Yearly_Budget__c = yb.Id
        );
        insert parentBudget;
        
        Departmental_Budget__c subBudget = new Departmental_Budget__c(
            Name='SubBudget of 2024-25',
            Department__c = dept.Id,
            Department_Budget_Amount__c = 200,
            Utilized_Budget__c = 200,
            Parent_Departmental_Budget__c = parentBudget.Id
        );
        insert subBudget;
        
        Proposal__c proposal = new Proposal__c (
            Name='Proposal for 2024-25',
            Departmental_Budget__c = subBudget.Id,
            Tentative_Date__c = Date.newInstance(2024, 12, 3),
            Budget__c = 200,
            Approved_Budget__c= 200
        );
        insert proposal;
    }
    
    @isTest
    static void testGetDepartments(){
        Departmental_Budget__c parentBudget = [
            SELECT Yearly_Budget__c
            FROM Departmental_Budget__c
            WHERE Parent_Departmental_Budget__c = NULL
            LIMIT 1
        ];
        
        Test.startTest();
        List<Map<String,String>> result = DepartmentalBudgetChartController.getDepartments(parentBudget.Yearly_Budget__c);
        Test.stopTest();
    }
    
    @isTest
    static void testgetSubDepartmentBudgetsWithProposalCount(){
        Departmental_Budget__c parentBudget = [
            SELECT Id FROM Departmental_Budget__c
            WHERE Parent_Departmental_Budget__c = NULL
            LIMIT 1
        ];

        Test.startTest();
        List<Map<String, Object>> result = DepartmentalBudgetChartController.getSubDepartmentBudgetsWithProposalCount(parentBudget.Id);
        Test.stopTest();
    }
}