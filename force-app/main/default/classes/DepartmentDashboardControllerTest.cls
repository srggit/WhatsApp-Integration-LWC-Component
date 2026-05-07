@isTest
private class DepartmentDashboardControllerTest {

    @testSetup
    static void setupData() {
        // Create department head user
        User departmentHead = TestUtils.createUser('depthead@test.com', 'DeptHead');

        // Create Yearly Budget
        Yearly_Budget__c yearlyBudget = new Yearly_Budget__c(
            Name = 'FY2025 Budget',
            Fiscal_Year__c = '2025-26',
            Budget_Amount__c = 100000,
            Business_Objective__c = '<p>Main Objective</p>',
            Expected_Outcome__c = '<p>Main Outcome</p>'
        );
        insert yearlyBudget;

        // Create Parent Department
        Department__c mainDepartment = new Department__c(
            Name = 'Main Department',
            Team_Name__c = 'Main Team',
            No_of_Member__c = 10,
            Region__c = 'North',
            User__c = departmentHead.Id
        );
        insert mainDepartment;

        // Create Parent Budget
        Departmental_Budget__c parentBudget = new Departmental_Budget__c(
            Name = 'Main Dept Budget',
            Department__c = mainDepartment.Id,
            Yearly_Budget__c = yearlyBudget.Id,
            Department_Budget_Amount__c = 50000,
            Budget_Objective__c = '<p>Main Objective</p>',
            Expected_Outcome__c = '<p>Main Outcome</p>'
        );
        insert parentBudget;

        // Create Sub Department
        Department__c subDepartment = new Department__c(
            Name = 'Sub Department',
            Team_Name__c = 'Sub Team',
            No_of_Member__c = 5,
            Region__c = 'South',
            Parent_Department__c = mainDepartment.Id,
            User__c = departmentHead.Id
        );
        insert subDepartment;

        // Create Sub Department Budget
        Departmental_Budget__c subBudget = new Departmental_Budget__c(
            Name = 'Sub Dept Budget',
            Department__c = subDepartment.Id,
            Parent_Departmental_Budget__c = parentBudget.Id,
            Department_Budget_Amount__c = 20000,
            Status__c = 'In Progress'
        );
        insert subBudget;
    }

    @isTest
    static void testGetAllFiscalYears() {
        Test.startTest();
        List<String> fiscalYears = DepartmentDashboardController.getAllFiscalYears();
        Test.stopTest();

        System.assertNotEquals(0, fiscalYears.size());
        System.assertEquals(true, fiscalYears.contains('2025-26'));
    }

    @isTest
    static void testGetDepartmentDataForHead() {
        User deptHead = [SELECT Id FROM User WHERE Email = 'depthead@test.com' LIMIT 1];

        System.runAs(deptHead) {
            Test.startTest();
            DepartmentDashboardController.DepartmentWrapper result =
                DepartmentDashboardController.getDepartmentDataForHead('2025-26');
            Test.stopTest();

            System.assertNotEquals(null, result);
            System.assertEquals('Main Department', result.name);
            System.assertEquals(50000, result.departmentBudgetAmount);
            System.assertEquals(100000, result.YearlyBudget);
            System.assert(result.budgetObjective != null && result.budgetObjective.contains('Main'));
        }
    }

    @isTest
    static void testGetDepartmentDataForHead_nullFiscalYear() {
        User deptHead = [SELECT Id FROM User WHERE Email = 'depthead@test.com' LIMIT 1];

        System.runAs(deptHead) {
            Test.startTest();
            DepartmentDashboardController.DepartmentWrapper result =
                DepartmentDashboardController.getDepartmentDataForHead(null);
            Test.stopTest();

            System.assertEquals(null, result, 'Should return null for null fiscal year');
        }
    }

    @isTest
    static void testGetSubDepartmentalBudgets() {
        Departmental_Budget__c parent = [
            SELECT Id FROM Departmental_Budget__c WHERE Parent_Departmental_Budget__c = null LIMIT 1
        ];

        Test.startTest();
        List<DepartmentDashboardController.SubDepartmentalBudgetWrapper> subBudgets =
            DepartmentDashboardController.getSubDepartmentalBudgets(parent.Id);
        Test.stopTest();

        System.assertEquals(1, subBudgets.size());
        System.assertEquals('Sub Dept Budget', subBudgets[0].budgetName);
        System.assertEquals('In Progress', subBudgets[0].status);
    }

    @isTest
    static void testGetSubDepartmentalBudgets_nullId() {
        Test.startTest();
        List<DepartmentDashboardController.SubDepartmentalBudgetWrapper> result =
            DepartmentDashboardController.getSubDepartmentalBudgets(null);
        Test.stopTest();

        System.assertEquals(0, result.size(), 'Should return empty list for null budget id');
    }
}