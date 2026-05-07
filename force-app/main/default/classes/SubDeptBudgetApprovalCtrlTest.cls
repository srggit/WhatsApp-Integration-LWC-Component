@isTest
public class SubDeptBudgetApprovalCtrlTest {

    @testSetup
    static void createTestData() {
        // Create Yearly Budget with sufficient amount for child budgets
        Yearly_Budget__c yearlyBudget = new Yearly_Budget__c(
            Name = 'FY25',
            Budget_Amount__c = 20000000 // 2 Crores or adjust to your org's field/API name
        );
        insert yearlyBudget;

        // Create Department Head User
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        User departmentHead = new User(
            Alias = 'dhead',
            Email = 'dhead@example.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'DeptHead',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            UserName = 'departmenthead' + System.currentTimeMillis() + '@example.com'
        );
        insert departmentHead;

        // Create Department
        Department__c department = new Department__c(
            Name = 'IT',
            User__c = departmentHead.Id
        );
        insert department;

        // Create Parent Departmental Budget - link ONLY to Yearly Budget, NOT parent budget
        Departmental_Budget__c parentBudget = new Departmental_Budget__c(
            Name = 'Main-Budget',
            Department__c = department.Id,
            Yearly_Budget__c = yearlyBudget.Id,
            Department_Budget_Amount__c = 10000000, // 1 Crore
            Budget_Objective__c = 'Expand infra'
            // Parent_Departmental_Budget__c NOT SET here
        );
        insert parentBudget;

        // Create Sub-Departmental Budgets - link ONLY to Parent Departmental Budget, NOT Yearly Budget
        Departmental_Budget__c sub1 = new Departmental_Budget__c(
            Name = 'IT Infra',
            Parent_Departmental_Budget__c = parentBudget.Id,
            Department__c = department.Id,
            Department_Budget_Amount__c = 5000000, // 50 Lakhs
            Budget_Objective__c = 'Upgrade servers'
            // Yearly_Budget__c NOT SET here
        );
        Departmental_Budget__c sub2 = new Departmental_Budget__c(
            Name = 'IT Security',
            Parent_Departmental_Budget__c = parentBudget.Id,
            Department__c = department.Id,
            Department_Budget_Amount__c = 4000000, // 40 Lakhs
            Budget_Objective__c = 'Cybersecurity tools'
            // Yearly_Budget__c NOT SET here
        );
        insert new List<Departmental_Budget__c>{ sub1, sub2 };

        // Create Proposals linked to sub-department budgets
        Proposal__c proposal1 = new Proposal__c(
            Name = 'Upgrade RAM',
            Departmental_Budget__c = sub1.Id,
            Budget__c = 600000,
            Expected_Revenue__c = 700000,
            Tentative_Date__c = System.today().addDays(10),
            Expected_Outcome__c = 'Faster processing'
        );
        Proposal__c proposal2 = new Proposal__c(
            Name = 'Firewall',
            Departmental_Budget__c = sub2.Id,
            Budget__c = 500000,
            Expected_Revenue__c = 900000,
            Tentative_Date__c = System.today().addDays(20),
            Expected_Outcome__c = 'Better security'
        );
        insert new List<Proposal__c>{ proposal1, proposal2 };
    }

    // Helper method to submit a budget for approval (creates pending approval)
    static void addPendingApprovalProcess(Id budgetId) {
        Departmental_Budget__c budget = [SELECT Id FROM Departmental_Budget__c WHERE Id = :budgetId LIMIT 1];
        Approval.ProcessSubmitRequest req = new Approval.ProcessSubmitRequest();
        req.setObjectId(budget.Id);
        Approval.ProcessResult result = Approval.process(req);
        System.assert(result.isSuccess(), 'Approval submission failed');
    }

    @isTest
    static void testGetPendingApprovalRequestsWithProposals() {
        // Prepare data: submit all sub-budgets for approval process
        List<Departmental_Budget__c> subs = [
            SELECT Id FROM Departmental_Budget__c WHERE Name IN ('IT Infra', 'IT Security')
        ];
        for (Departmental_Budget__c sub : subs) addPendingApprovalProcess(sub.Id);

        Departmental_Budget__c parentBudget = [
            SELECT Id FROM Departmental_Budget__c WHERE Parent_Departmental_Budget__c = null LIMIT 1
        ];

        Test.startTest();
        List<SubDepartmentalBudgetApprovalController.ApprovalRequestWrapper> results =
            SubDepartmentalBudgetApprovalController.getPendingApprovalRequestsWithProposals(parentBudget.Id);
        Test.stopTest();

        System.assert(results.size() > 0, 'No approval requests returned');

        for (SubDepartmentalBudgetApprovalController.ApprovalRequestWrapper wrap : results) {
            System.assertNotEquals(null, wrap.workitemId);
            System.assertNotEquals(null, wrap.budgetId);
            System.assertNotEquals(null, wrap.budgetName);
            System.assertNotEquals(null, wrap.formattedBudgetAmount);
            System.assertNotEquals(null, wrap.proposals);
        }
    }

    @isTest
    static void testGetPendingApprovalRequestsWithProposalsEmptyInput() {
        Test.startTest();
        List<SubDepartmentalBudgetApprovalController.ApprovalRequestWrapper> results =
            SubDepartmentalBudgetApprovalController.getPendingApprovalRequestsWithProposals(null);
        Test.stopTest();
        System.assertEquals(0, results.size(), 'List expected to be empty on null input');
    }

    @isTest
    static void testDebugApprovalData() {
        Departmental_Budget__c parentBudget = [
            SELECT Id FROM Departmental_Budget__c WHERE Parent_Departmental_Budget__c = null LIMIT 1
        ];
        Test.startTest();
        Map<String, Object> debugInfo = SubDepartmentalBudgetApprovalController.debugApprovalData(parentBudget.Id);
        Test.stopTest();

        System.assert(debugInfo.containsKey('subBudgetsCount'));
        System.assert(debugInfo.containsKey('subBudgets'));
        System.assert(debugInfo.containsKey('allProcesses'));
    }

    @isTest
    static void testProcessApprovalApproveReject() {
        // Submit two sub-budgets for approval
        Departmental_Budget__c sub1 = [SELECT Id FROM Departmental_Budget__c WHERE Name = 'IT Infra' LIMIT 1];
        Departmental_Budget__c sub2 = [SELECT Id FROM Departmental_Budget__c WHERE Name = 'IT Security' LIMIT 1];
        addPendingApprovalProcess(sub1.Id);
        addPendingApprovalProcess(sub2.Id);

        ProcessInstanceWorkitem workitem1 = [
            SELECT Id FROM ProcessInstanceWorkitem WHERE ProcessInstance.TargetObjectId = :sub1.Id LIMIT 1
        ];
        ProcessInstanceWorkitem workitem2 = [
            SELECT Id FROM ProcessInstanceWorkitem WHERE ProcessInstance.TargetObjectId = :sub2.Id LIMIT 1
        ];

        Test.startTest();

        // Approve first workitem
        String resultApprove = SubDepartmentalBudgetApprovalController.processApproval(workitem1.Id, 'Approve', 'Approved in test');
        System.assert(resultApprove.contains('Success'));

        // Attempt invalid action
        Boolean caughtException = false;
        try {
            SubDepartmentalBudgetApprovalController.processApproval(workitem1.Id, 'InvalidAction', 'Should fail');
        } catch(Exception e) {
            caughtException = true;
        }
        System.assert(caughtException, 'Exception expected on invalid action');

        // Reject second workitem
        String resultReject = SubDepartmentalBudgetApprovalController.processApproval(workitem2.Id, 'Reject', 'Rejected in test');
        System.assert(resultReject.contains('Success'));

        Test.stopTest();
    }

    @isTest
    static void testProcessApprovalValidation() {
        Boolean caughtException = false;
        try {
            SubDepartmentalBudgetApprovalController.processApproval(null, 'Approve', null);
        } catch(Exception e) {
            caughtException = true;
        }
        System.assert(caughtException, 'Exception expected when WorkitemId is null');
    }
}