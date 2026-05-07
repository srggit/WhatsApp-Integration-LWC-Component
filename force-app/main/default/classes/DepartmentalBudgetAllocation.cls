public with sharing class DepartmentalBudgetAllocation {

    @AuraEnabled(cacheable=true)
    public static List<Departmental_Budget__c> getDepartmentalDetails(String yearlyBudgetId) {
        System.debug('>> Entering getDepartmentalDetails with yearlyBudgetId: ' + yearlyBudgetId);
        
        if (String.isBlank(yearlyBudgetId)) {
            System.debug('>> No yearlyBudgetId provided, returning empty list');
            return new List<Departmental_Budget__c>();
        }
        
        try {
            List<Departmental_Budget__c> budgetList = [
                SELECT Id, Name, 
                    Department__r.Name, 
                    Department_Budget_Amount__c, 
                    Department__r.User__r.Name,
                    Budget_Objective__c, 
                    Expected_Outcome__c, 
                    Utilized_Budget__c,
                    Utilized__c, 
                    LastModifiedDate, 
                    Yearly_Budget__r.Fiscal_Year__c,
                    Yearly_Budget__r.Start_Date__c, 
                    Yearly_Budget__r.End_Date__c,
                    Yearly_Budget__r.Budget_Amount__c,
                    Yearly_Budget__r.Utilized_Budget__c
                FROM Departmental_Budget__c 
                WHERE Yearly_Budget__c = :yearlyBudgetId 
                AND Parent_Departmental_Budget__c = null
                ORDER BY Name ASC
            ];
            
            System.debug('>> Retrieved ' + budgetList.size() + ' Departmental Budget records');
            return budgetList;
            
        } catch (Exception e) {
            System.debug('!! Exception in getDepartmentalDetails: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving departmental budget details: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=false)
    public static List<Department__c> getDepartmentsList() {
        System.debug('>> Entering getDepartmentsList');
        return [
            SELECT Id, Name
            FROM Department__c
            WHERE Parent_Department__c = null
            ORDER BY Name
        ];
    }

    @AuraEnabled
    public static void saveDepartmentalBudget(String name, Id departmentId, Id yearlyBudgetId, Decimal amount, String objective, String outcome) {
        System.debug(String.format('>> Entering saveDepartmentalBudget with values: Name={0}, DepartmentId={1}, YearlyBudgetId={2}, Amount={3}', new List<String>{name, String.valueOf(departmentId), String.valueOf(yearlyBudgetId), String.valueOf(amount)}));
        try {
            Departmental_Budget__c budget = new Departmental_Budget__c(
                Name = name,
                Department__c = departmentId,
                Yearly_Budget__c = yearlyBudgetId,
                Department_Budget_Amount__c = amount,
                Budget_Objective__c = objective,
                Expected_Outcome__c = outcome
            );
            insert budget;
            System.debug('>> Departmental Budget inserted successfully: ' + budget.Id);
        } catch (Exception e) {
            System.debug('!! Exception in saveDepartmentalBudget: ' + e.getMessage());
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=false)
    public static Departmental_Budget__c getDepartmentalBudgetById(Id budgetId) {
        System.debug('>> Entering getDepartmentalBudgetById with ID: ' + budgetId);
        try {
            Departmental_Budget__c result = [
                SELECT Id, Name, Department__r.Name, Department_Budget_Amount__c,
                       Department__r.User__r.Name,
                       Yearly_Budget__r.Start_Date__c, Yearly_Budget__r.End_Date__c,
                       Utilized_Budget__c, Utilized__c, Yearly_Budget__r.Fiscal_Year__c,
                       Budget_Objective__c, Expected_Outcome__c, LastModifiedDate
                FROM Departmental_Budget__c
                WHERE Id = :budgetId
                LIMIT 1
            ];
            System.debug('>> Retrieved Departmental Budget: ' + result.Id);
            return result;
        } catch (Exception e) {
            System.debug('!! Exception in getDepartmentalBudgetById: ' + e.getMessage());
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=false)
    public static List<Departmental_Budget__c> getChildDepartmentalBudgets(Id parentBudgetId) {
        System.debug('>> Entering getChildDepartmentalBudgets with Parent ID: ' + parentBudgetId);
        try {
            List<Departmental_Budget__c> childBudgets = [
                SELECT Id, Name, Department__c, Department__r.Name, Department_Budget_Amount__c,
                       Utilized_Budget__c, Utilized__c, Yearly_Budget__c, Parent_Departmental_Budget__c
                FROM Departmental_Budget__c
                WHERE Parent_Departmental_Budget__c = :parentBudgetId AND Status__c = 'Approved'
                ORDER BY Department__r.Name
            ];
            System.debug('>> Retrieved ' + childBudgets.size() + ' child Departmental Budgets');
            return childBudgets;
        } catch (Exception e) {
            System.debug('!! Exception in getChildDepartmentalBudgets: ' + e.getMessage());
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=false)
    public static List<Proposal__c> getProposalsByDepartmentalBudget(Id departmentalBudgetId) {
        System.debug('>> Entering getProposalsByDepartmentalBudget with ID: ' + departmentalBudgetId);
        try {
            List<Proposal__c> proposals = [
                SELECT Id, Name, Budget__c, Approved_Budget__c, Expected_Revenue__c, Actual_Revenue__c, Tentative_Date__c,
                       Team_Member__c, Team_Member__r.Name, Expected_Outcome__c
                FROM Proposal__c
                WHERE Departmental_Budget__c = :departmentalBudgetId
                ORDER BY Name ASC
            ];
            System.debug('>> Retrieved ' + proposals.size() + ' proposals for budget ID: ' + departmentalBudgetId);
            return proposals;
        } catch (Exception e) {
            System.debug('!! Exception in getProposalsByDepartmentalBudget: ' + e.getMessage());
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=false)
    public static List<Proposal__c> getUpcomingScheduleForParentDepartment(Id parentDepartmentalBudgetId) {
        System.debug('>> Entering getUpcomingScheduleForParentDepartment with Parent ID: ' + parentDepartmentalBudgetId);
        try {
            List<Departmental_Budget__c> childDepartments = [
                SELECT Id 
                FROM Departmental_Budget__c 
                WHERE Parent_Departmental_Budget__c = :parentDepartmentalBudgetId AND Status__c = 'Approved'
            ];

            Set<Id> childDeptIds = new Set<Id>();
            for (Departmental_Budget__c dept : childDepartments) {
                childDeptIds.add(dept.Id);
            }

            System.debug('>> Child Departments found: ' + childDeptIds.size());

            if (childDeptIds.isEmpty()) {
                System.debug('>> No child departments found. Returning empty list.');
                return new List<Proposal__c>();
            }

            List<Proposal__c> upcomingProposals = [
                SELECT Id, Name, Budget__c, Tentative_Date__c,
                       Team_Member__c, Team_Member__r.Name, Expected_Outcome__c,
                       Departmental_Budget__c, Departmental_Budget__r.Department__r.Name
                FROM Proposal__c
                WHERE Departmental_Budget__c IN :childDeptIds
                AND Tentative_Date__c >= TODAY
                ORDER BY Tentative_Date__c ASC
            ];

            System.debug('>> Retrieved ' + upcomingProposals.size() + ' upcoming proposals for child departments');
            return upcomingProposals;
        } catch (Exception e) {
            System.debug('!! Exception in getUpcomingScheduleForParentDepartment: ' + e.getMessage());
            throw new AuraHandledException(e.getMessage());
        }
    }
}