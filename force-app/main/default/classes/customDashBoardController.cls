public with sharing class customDashBoardController {

    @AuraEnabled(cacheable=true)
    public static List<Yearly_Budget__c> getAvailableFiscalYears() {
        return [
            SELECT Id, Name, Fiscal_Year__c
            FROM Yearly_Budget__c
            ORDER BY Fiscal_Year__c ASC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getDepartmentalPerformance(String yearlyBudgetId) {
        List<Departmental_Budget__c> records = [
            SELECT Id, Department_Budget_Amount__c, Utilized_Budget__c,
                   Department__r.Name, Department__c
            FROM Departmental_Budget__c
            WHERE Yearly_Budget__c = :yearlyBudgetId
              AND Department_Budget_Amount__c != null
              AND Utilized_Budget__c != null
        ];

        List<Map<String, Object>> result = new List<Map<String, Object>>();
        for (Departmental_Budget__c dept : records) {
            Map<String, Object> row = new Map<String, Object>();
            row.put('label', dept.Department__r.Name);
            row.put('budget', dept.Department_Budget_Amount__c);
            row.put('utilized', dept.Utilized_Budget__c);
            row.put('id', dept.Id);
            row.put('departmentId', dept.Department__c);
            result.add(row);
        }
        return result;
    }

    @AuraEnabled(cacheable=true)
public static List<SubDepartmentBudgetWrapper> getSubDepartmentBudgets(Id parentBudgetId) {
    List<SubDepartmentBudgetWrapper> result = new List<SubDepartmentBudgetWrapper>();

    // Query child Departmental_Budget__c records where Parent_Departmental_Budget__c = parentBudgetId
    List<Departmental_Budget__c> budgets = [
        SELECT Id, Name, Department_Budget_Amount__c, Utilized_Budget__c
        FROM Departmental_Budget__c
        WHERE Parent_Departmental_Budget__c = :parentBudgetId
    ];

    for (Departmental_Budget__c b : budgets) {
        SubDepartmentBudgetWrapper wrap = new SubDepartmentBudgetWrapper();
        wrap.label = b.Name;
        wrap.id = b.Id;  // Add this line
        wrap.totalBudget = b.Department_Budget_Amount__c;
        wrap.utilized = b.Utilized_Budget__c;
        result.add(wrap);
    }

    return result;
}

    public class SubDepartmentBudgetWrapper {
        @AuraEnabled public String label { get; set; }
        @AuraEnabled public String id { get; set; }  // Add this line
        @AuraEnabled public Decimal totalBudget { get; set; }
        @AuraEnabled public Decimal utilized { get; set; }
    }


    // Add this method to your existing customDashBoardController class

@AuraEnabled(cacheable=true)
public static List<ProposalBudgetWrapper> getProposalBudgets(Id departmentalBudgetId) {
    List<ProposalBudgetWrapper> result = new List<ProposalBudgetWrapper>();

    // Query Proposal__c records where Departmental_Budget__c = departmentalBudgetId
    // Remove the filter for Approved_Budget__c != null to include all proposals
    List<Proposal__c> proposals = [
        SELECT Id, Name, Approved_Budget__c, Actual_Revenue__c, Budget__c
        FROM Proposal__c
        WHERE Departmental_Budget__c = :departmentalBudgetId
    ];

    for (Proposal__c p : proposals) {
        ProposalBudgetWrapper wrap = new ProposalBudgetWrapper();
        wrap.name = p.Name;
        wrap.approvedBudget = p.Approved_Budget__c != null ? p.Approved_Budget__c : 0;
        wrap.actualRevenue = p.Actual_Revenue__c != null ? p.Actual_Revenue__c : 0;
        wrap.askedBudget = p.Budget__c != null ? p.Budget__c : 0;
        result.add(wrap);
    }

    return result;
}

// Add this wrapper class to your existing customDashBoardController class
public class ProposalBudgetWrapper {
    @AuraEnabled public String name { get; set; }
    @AuraEnabled public Decimal approvedBudget { get; set; }
    @AuraEnabled public Decimal actualRevenue { get; set; }
    @AuraEnabled public Decimal askedBudget { get; set; }
}
}