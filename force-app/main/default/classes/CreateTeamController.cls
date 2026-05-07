public with sharing class CreateTeamController {

    @AuraEnabled(cacheable=true)
    public static List<User> getTeamUsers() {
        return [
            SELECT Id, Name FROM User
            WHERE IsActive = true
            ORDER BY Name
        ];
    }

    public class InitData {
        @AuraEnabled public Decimal availableBudget;
        @AuraEnabled public String fiscalYear;
        @AuraEnabled public Date startDate;
        @AuraEnabled public Date endDate;
    }

    @AuraEnabled(cacheable=true)
    public static InitData getInitialTeamData(String fiscalYear) {
        InitData result = new InitData();
        Id userId = UserInfo.getUserId();

        List<Department__c> deptList = [
            SELECT Id
            FROM Department__c
            WHERE User__c = :userId AND Parent_Department__c = null
            LIMIT 1
        ];
        if (deptList.isEmpty()) {
            throw new AuraHandledException('No department found for current user.');
        }

        Department__c dept = deptList[0];

        List<Yearly_Budget__c> yearList = [
            SELECT Id, Fiscal_Year__c, Start_Date__c, End_Date__c
            FROM Yearly_Budget__c
            WHERE Fiscal_Year__c = :fiscalYear
            LIMIT 1
        ];
        if (yearList.isEmpty()) {
            throw new AuraHandledException('No fiscal year found for: ' + fiscalYear);
        }

        Yearly_Budget__c year = yearList[0];

        List<Departmental_Budget__c> budgetList = [
            SELECT Id, Name, Department_Budget_Amount__c, Utilized_Budget__c, Yearly_Budget__r.Fiscal_Year__c,
                   Yearly_Budget__r.Start_Date__c, Yearly_Budget__r.End_Date__c
            FROM Departmental_Budget__c
            WHERE Department__c = :dept.Id
              AND Parent_Departmental_Budget__c = null
              AND Yearly_Budget__r.Fiscal_Year__c = :fiscalYear
            LIMIT 1
        ];
        if (budgetList.isEmpty()) {
            throw new AuraHandledException('No departmental budget found for fiscal year: ' + fiscalYear);
        }

        Departmental_Budget__c db = budgetList[0];

        result.availableBudget = (db.Department_Budget_Amount__c != null ? db.Department_Budget_Amount__c : 0) -
                                 (db.Utilized_Budget__c != null ? db.Utilized_Budget__c : 0);
        result.fiscalYear = db.Yearly_Budget__r.Fiscal_Year__c;
        result.startDate = db.Yearly_Budget__r.Start_Date__c;
        result.endDate = db.Yearly_Budget__r.End_Date__c;

        return result;
    }

    public class ProposalWrapper {
        public String name;
        public String outcome;
        public Decimal budget;
        public String dates;
        public String assignTo;
        public Decimal revenue;
    }

    public class PayloadWrapper {
        public String teamName;
        public Decimal NoOfMembers;
        public String region;
        public String TeamHead;
        @AuraEnabled public String departmentalBudgetName;
        public Decimal budgetAllotted;
        public String budgetObjective;
        public String expectedOutcome;
        public String fiscalYear;
        public List<ProposalWrapper> activities;
    }

    @AuraEnabled
    public static void saveTeamData(String payload) {
        PayloadWrapper data = (PayloadWrapper)JSON.deserialize(payload, PayloadWrapper.class);
        Id userId = UserInfo.getUserId();

        // Basic validation
        if (String.isBlank(data.teamName) || data.budgetAllotted == null || String.isBlank(data.departmentalBudgetName)) {
            throw new AuraHandledException('Missing required team or budget fields.');
        }

        List<Department__c> parentDeptList = [
            SELECT Id FROM Department__c WHERE User__c = :userId AND Parent_Department__c = null LIMIT 1
        ];
        if (parentDeptList.isEmpty()) {
            throw new AuraHandledException('No parent department found for current user.');
        }

        Department__c parentDept = parentDeptList[0];

        Department__c newTeam = new Department__c(
            Name = data.teamName,
            Team_Name__c = data.teamName,
            Parent_Department__c = parentDept.Id,
            User__c = userId,
            Region__c = data.region,
            No_of_Member__c = data.NoOfMembers
        );
        insert newTeam;

        List<Departmental_Budget__c> parentBudgetList = [
            SELECT Id, Name, Yearly_Budget__c, Yearly_Budget__r.Fiscal_Year__c
            FROM Departmental_Budget__c
            WHERE Department__c = :parentDept.Id
              AND Parent_Departmental_Budget__c = null
              AND Yearly_Budget__r.Fiscal_Year__c = :data.fiscalYear
            LIMIT 1
        ];
        if (parentBudgetList.isEmpty()) {
            throw new AuraHandledException('No parent departmental budget found for fiscal year ' + data.fiscalYear);
        }

        Departmental_Budget__c parentBudget = parentBudgetList[0];

        Departmental_Budget__c budget = new Departmental_Budget__c(
            Name = data.departmentalBudgetName,
            Department__c = newTeam.Id,
            Department_Budget_Amount__c = data.budgetAllotted,
            Budget_Objective__c = data.budgetObjective,
            Expected_Outcome__c = data.expectedOutcome,
            Parent_Departmental_Budget__c = parentBudget.Id
        );
        insert budget;

        // Create proposals
        List<Proposal__c> proposals = new List<Proposal__c>();
        if (data.activities != null && !data.activities.isEmpty()) {
            for (ProposalWrapper act : data.activities) {
                Date dateValue;
                try {
                    dateValue = String.isNotBlank(act.dates) ? Date.valueOf(act.dates) : null;
                } catch (Exception e) {
                    throw new AuraHandledException('Invalid date in proposal: ' + act.name);
                }

                proposals.add(new Proposal__c(
                    Name = act.name,
                    Expected_Outcome__c = act.outcome,
                    Budget__c = act.budget,
                    Tentative_Date__c = dateValue,
                    Expected_Revenue__c = act.revenue,
                    Team_Member__c = act.assignTo,
                    Departmental_Budget__c = budget.Id
                ));
            }
            insert proposals;
        }

        // Submit for approval
        try {
            Approval.ProcessSubmitRequest req = new Approval.ProcessSubmitRequest();
            req.setObjectId(budget.Id);
            req.setComments('Submitted via Create Team Modal');
            Approval.ProcessResult result = Approval.process(req);

            if (!result.isSuccess()) {
                String msg = (result.getErrors() != null && result.getErrors().size() > 0)
                    ? result.getErrors()[0].getMessage()
                    : 'Unknown approval error.';
                throw new AuraHandledException('Approval failed: ' + msg);
            }
        } catch (Exception ex) {
            throw new AuraHandledException('Approval error: ' + ex.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<ProcessInstanceWorkitem> getPendingApprovals() {
        return [
            SELECT Id, ProcessInstance.TargetObjectId, ProcessInstance.TargetObject.Name,
                   ProcessInstance.Status, Actor.Name, CreatedDate
            FROM ProcessInstanceWorkitem
            WHERE ActorId = :UserInfo.getUserId()
        ];
    }

    @AuraEnabled
    public static void processApproval(String workItemId, Boolean isApprove) {
        Approval.ProcessWorkitemRequest req = new Approval.ProcessWorkitemRequest();
        req.setAction(isApprove ? 'Approve' : 'Reject');
        req.setComments(isApprove ? 'Approved via LWC' : 'Rejected via LWC');
        req.setWorkitemId(workItemId);

        Approval.ProcessResult result = Approval.process(req);
        if (!result.isSuccess()) {
            String msg = (result.getErrors() != null && result.getErrors().size() > 0)
                ? result.getErrors()[0].getMessage()
                : 'Unknown approval failure.';
            throw new AuraHandledException('Approval failed: ' + msg);
        }
    }
}