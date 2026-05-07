@isTest
private class CustomDashboardControllerTest {

    @isTest
    static void testGetAvailableFiscalYears() {
        Yearly_Budget__c yearlyBudget = new Yearly_Budget__c(
            Name = 'FY2025',
            Fiscal_Year__c = '2025-26',
            Budget_Amount__c = 2000
        );
        insert yearlyBudget;

        Test.startTest();
        List<Yearly_Budget__c> years = customDashBoardController.getAvailableFiscalYears();
        Test.stopTest();

        System.assertNotEquals(0, years.size());
    }

    @isTest
    static void testGetDepartmentalPerformance() {
        Yearly_Budget__c yearlyBudget = new Yearly_Budget__c(
            Name = 'FY2025',
            Fiscal_Year__c = '2025-26',
            Budget_Amount__c = 2000
        );
        insert yearlyBudget;

        Department__c dept = new Department__c(Name = 'IT Department');
        insert dept;

        Departmental_Budget__c deptBudget = new Departmental_Budget__c(
            Department_Budget_Amount__c = 1500,
            Utilized_Budget__c = 500,
            Yearly_Budget__c = yearlyBudget.Id,
            Department__c = dept.Id
        );
        insert deptBudget;

        Test.startTest();
        List<Map<String, Object>> result = customDashBoardController.getDepartmentalPerformance(yearlyBudget.Id);
        Test.stopTest();

        System.assertNotEquals(0, result.size());
    }

    @isTest
    static void testGetSubDepartmentBudgets() {
        Yearly_Budget__c yearlyBudget = new Yearly_Budget__c(
            Name = 'FY2026',
            Fiscal_Year__c = '2026-27',
            Budget_Amount__c = 3000
        );
        insert yearlyBudget;

        Department__c dept = new Department__c(Name = 'Finance');
        insert dept;

        Departmental_Budget__c parentBudget = new Departmental_Budget__c(
            Department_Budget_Amount__c = 2500,
            Utilized_Budget__c = 1200,
            Yearly_Budget__c = yearlyBudget.Id,
            Department__c = dept.Id
        );
        insert parentBudget;
        
        Departmental_Budget__c childBudget = new Departmental_Budget__c(
            Department_Budget_Amount__c = 800,
            Utilized_Budget__c = 300,
            Parent_Departmental_Budget__c = parentBudget.Id,
            Department__c = dept.Id
        );
        insert childBudget;

        Test.startTest();
        List<customDashBoardController.SubDepartmentBudgetWrapper> result =
            customDashBoardController.getSubDepartmentBudgets(parentBudget.Id);
        Test.stopTest();

        System.assertEquals(1, result.size());
    }

    @isTest
    static void testGetProposalBudgets() {
        Yearly_Budget__c yearlyBudget = new Yearly_Budget__c(
            Name = 'FY2027',
            Fiscal_Year__c = '2027-28',
            Budget_Amount__c = 4000
        );
        insert yearlyBudget;
    
        Department__c dept = new Department__c(Name = 'Operations');
        insert dept;
    
        Departmental_Budget__c parentBudget = new Departmental_Budget__c(
            Name = 'Parent Budget',
            Department_Budget_Amount__c = 1000,
            Utilized_Budget__c = 400,
            Yearly_Budget__c = yearlyBudget.Id,
            Department__c = dept.Id
        );
        insert parentBudget;
    
        Departmental_Budget__c deptBudget = new Departmental_Budget__c(
            Name = 'Dept Budget A',
            Department_Budget_Amount__c = 1000,
            Utilized_Budget__c = 1000,
            Department__c = dept.Id,
            Parent_Departmental_Budget__c = parentBudget.Id 
            
        );
        insert deptBudget;
        Proposal__c proposal = new Proposal__c(
            Name = 'Proposal A',
            Approved_Budget__c = 800,
            Actual_Revenue__c = 700,
            Budget__c = 1000,
            Tentative_Date__c = Date.today().addDays(30),
            Departmental_Budget__c = deptBudget.Id
        );
        insert proposal;
    
        // Execute the method
        Test.startTest();
        List<customDashBoardController.ProposalBudgetWrapper> result =
            customDashBoardController.getProposalBudgets(deptBudget.Id);
        Test.stopTest();
    
        System.assertEquals(1, result.size(), 'Expected one proposal budget wrapper result');
        System.assertEquals(800, result[0].approvedBudget);
        System.assertEquals(700, result[0].actualRevenue);
        System.assertEquals(1000, result[0].askedBudget);
    }

}