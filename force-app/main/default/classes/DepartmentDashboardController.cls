public with sharing class DepartmentDashboardController {

    public class DepartmentWrapper {
        @AuraEnabled public String name;
        @AuraEnabled public String teamName;
        @AuraEnabled public Decimal noOfMembers;
        @AuraEnabled public String region;
        @AuraEnabled public String departmentHead;

        @AuraEnabled public Id departmentId;
        @AuraEnabled public Id departmentBudgetId;

        @AuraEnabled public Decimal departmentBudgetAmount;
        @AuraEnabled public Decimal departmentutilizedBudget;
        @AuraEnabled public Decimal departmentutilizedPercent;
        @AuraEnabled public Decimal YearlyBudget;
        @AuraEnabled public String departmentalBudgetName;

        @AuraEnabled public String budgetObjective;
        @AuraEnabled public String expectedOutcome;
    }

    public class SubDepartmentalBudgetWrapper {
        @AuraEnabled public Id budgetId;
        @AuraEnabled public String budgetName;
        @AuraEnabled public Id departmentId;
        @AuraEnabled public String departmentName;
        @AuraEnabled public String teamHead;
        @AuraEnabled public Decimal budgetAllocated;
        @AuraEnabled public Decimal utilizedBudget;
        @AuraEnabled public Decimal utilizedPercent;
        @AuraEnabled public String fiscalYear;
        @AuraEnabled public String status;
    }

    @AuraEnabled(cacheable=true)
    public static List<String> getAllFiscalYears() {
        List<String> yearList = new List<String>();
        try {
            Set<String> uniqueYears = new Set<String>();
            for (Yearly_Budget__c yb : [
                SELECT Fiscal_Year__c FROM Yearly_Budget__c WHERE Fiscal_Year__c != null ORDER BY Fiscal_Year__c ASC
            ]) {
                uniqueYears.add(yb.Fiscal_Year__c);
            }
            yearList.addAll(uniqueYears);
        } catch (Exception e) {
            System.debug('Error in getAllFiscalYears: ' + e.getMessage());
        }
        return yearList;
    }

    @AuraEnabled(cacheable=true)
    public static DepartmentWrapper getDepartmentDataForHead(String fiscalYear) {
        DepartmentWrapper result = new DepartmentWrapper();

        try {
            if (String.isBlank(fiscalYear)) {
                System.debug('Provided fiscalYear is null or blank.');
                return null;
            }

            Id userId = UserInfo.getUserId();

            List<Department__c> depts = [
                SELECT Id, Name, Team_Name__c, No_of_Member__c, Region__c, User__r.Name
                FROM Department__c
                WHERE User__c = :userId AND Parent_Department__c = null
                LIMIT 1
            ];

            if (depts.isEmpty()) {
                System.debug('No top-level department found for current user.');
                return null;
            }

            Department__c dept = depts[0];

            result.departmentId = dept.Id;
            result.name = dept.Name;
            result.teamName = dept.Team_Name__c;
            result.noOfMembers = dept.No_of_Member__c;
            result.region = dept.Region__c;
            result.departmentHead = dept.User__r != null ? dept.User__r.Name : null;

            List<Departmental_Budget__c> depBudgets = [
                SELECT Id, Name, Department_Budget_Amount__c, Utilized_Budget__c, Utilized__c,
                       Yearly_Budget__r.Name, Yearly_Budget__r.Budget_Amount__c,
                       Budget_Objective__c, Expected_Outcome__c
                FROM Departmental_Budget__c
                WHERE Department__c = :dept.Id
                  AND Parent_Departmental_Budget__c = null
                  AND Yearly_Budget__r.Fiscal_Year__c = :fiscalYear
                LIMIT 1
            ];

            if (!depBudgets.isEmpty()) {
                Departmental_Budget__c db = depBudgets[0];
                result.departmentBudgetId = db.Id;
                result.departmentBudgetAmount = db.Department_Budget_Amount__c;
                result.YearlyBudget = db.Yearly_Budget__r != null ? db.Yearly_Budget__r.Budget_Amount__c : null;
                result.departmentalBudgetName = db.Name;
                result.departmentutilizedBudget = db.Utilized_Budget__c;
                result.departmentutilizedPercent = db.Utilized__c;
                result.budgetObjective = db.Budget_Objective__c;
                result.expectedOutcome = db.Expected_Outcome__c;
            }

        } catch (Exception e) {
            System.debug('Error in getDepartmentDataForHead: ' + e.getMessage());
            return null;
        }

        return result;
    }

    @AuraEnabled(cacheable=true)
    public static List<SubDepartmentalBudgetWrapper> getSubDepartmentalBudgets(Id departmentBudgetId) {
        List<SubDepartmentalBudgetWrapper> subBudgetList = new List<SubDepartmentalBudgetWrapper>();

        try {
            if (departmentBudgetId == null) {
                System.debug('departmentBudgetId is null.');
                return subBudgetList;
            }

            List<Departmental_Budget__c> subBudgets = [
                SELECT Id, Name, Status__c, Department_Budget_Amount__c, Utilized_Budget__c, Utilized__c,
                       Department__c, Department__r.Name, Department__r.User__r.Name,
                       Yearly_Budget__r.Fiscal_Year__c
                FROM Departmental_Budget__c
                WHERE Parent_Departmental_Budget__c = :departmentBudgetId
                ORDER BY CreatedDate ASC
            ];

            for (Departmental_Budget__c subBudget : subBudgets) {
                SubDepartmentalBudgetWrapper wrapper = new SubDepartmentalBudgetWrapper();
                wrapper.budgetId = subBudget.Id;
                wrapper.budgetName = subBudget.Name;
                wrapper.departmentId = subBudget.Department__c;
                wrapper.departmentName = subBudget.Department__r != null ? subBudget.Department__r.Name : null;
                wrapper.teamHead = subBudget.Department__r?.User__r?.Name;
                wrapper.budgetAllocated = subBudget.Department_Budget_Amount__c != null ? subBudget.Department_Budget_Amount__c : 0;
                wrapper.utilizedBudget = subBudget.Utilized_Budget__c != null ? subBudget.Utilized_Budget__c : 0;
                wrapper.utilizedPercent = subBudget.Utilized__c != null ? subBudget.Utilized__c : 0;
                wrapper.fiscalYear = subBudget.Yearly_Budget__r != null ? subBudget.Yearly_Budget__r.Fiscal_Year__c : null;
                wrapper.status = subBudget.Status__c;
                subBudgetList.add(wrapper);
            }

        } catch (Exception e) {
            System.debug('Error in getSubDepartmentalBudgets: ' + e.getMessage());
        }

        return subBudgetList;
    }
}