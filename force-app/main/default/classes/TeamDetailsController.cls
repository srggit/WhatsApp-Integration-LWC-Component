public with sharing class TeamDetailsController {

    @AuraEnabled(cacheable=true)
    public static TeamDetailsWrapper getTeamDetails(Id teamId, String fiscalYear) {
        TeamDetailsWrapper wrapper = new TeamDetailsWrapper();

        try {
            Department__c team = [
                SELECT Id, Name, Region__c, User__r.Name,
                    (SELECT Id, Department_Budget_Amount__c, Status__c, Budget_Objective__c, Utilized_Budget__c, Utilized__c, Expected_Outcome__c,
                            Parent_Departmental_Budget__c,
                            Parent_Departmental_Budget__r.Yearly_Budget__r.Fiscal_Year__c,
                            (SELECT Id, Name, Expected_Outcome__c, Budget__c, Tentative_Date__c, Team_Member__c, Team_Member__r.Name,
                                     Expected_Revenue__c, Approved_Budget__c, Actual_Revenue__c
                             FROM Proposals__r)
                     FROM Departmental_Budgets__r
                     WHERE Parent_Departmental_Budget__c != null
                       AND Parent_Departmental_Budget__r.Yearly_Budget__r.Fiscal_Year__c = :fiscalYear
                     ORDER BY CreatedDate DESC
                     LIMIT 1)
                FROM Department__c
                WHERE Id = :teamId
                LIMIT 1
            ];

            wrapper.teamName = team.Name;
            wrapper.teamHead = team.User__r != null ? team.User__r.Name : 'N/A';

            if (team.Departmental_Budgets__r != null && !team.Departmental_Budgets__r.isEmpty()) {
                Departmental_Budget__c budget = team.Departmental_Budgets__r[0];

                wrapper.departmentalBudgetStatus = budget.Status__c;
                wrapper.budgetAllocated = budget.Department_Budget_Amount__c != null ? budget.Department_Budget_Amount__c : 0;
                wrapper.fiscalYear = budget.Parent_Departmental_Budget__r?.Yearly_Budget__r?.Fiscal_Year__c;
                wrapper.budgetObjective = budget.Budget_Objective__c != null ? budget.Budget_Objective__c : '';
                wrapper.expectedOutcome = budget.Expected_Outcome__c != null ? budget.Expected_Outcome__c : '';
                wrapper.parentDepartmentalBudgetId = budget.Parent_Departmental_Budget__c;

                wrapper.goals = new List<GoalWrapper>();
                wrapper.activities = new List<ActivityWrapper>();

                if (budget.Proposals__r != null) {
                    for (Proposal__c p : budget.Proposals__r) {
                        wrapper.activities.add(new ActivityWrapper(p));
                    }
                }

                wrapper.budgetUtilized = budget.Utilized_Budget__c != null ? budget.Utilized_Budget__c : 0;
                wrapper.utilizedPercent = budget.Utilized__c != null ? budget.Utilized__c : 0;
            } else {
                // No budget found — fallback defaults
                wrapper.budgetAllocated = 0;
                wrapper.fiscalYear = fiscalYear;
                wrapper.budgetObjective = '';
                wrapper.expectedOutcome = '';
                wrapper.parentDepartmentalBudgetId = null;
                wrapper.goals = new List<GoalWrapper>();
                wrapper.activities = new List<ActivityWrapper>();
                wrapper.budgetUtilized = 0;
                wrapper.utilizedPercent = 0;
            }

        } catch (Exception ex) {
            System.debug('Error in getTeamDetails: ' + ex.getMessage());
            // Fallback defaults
            wrapper.teamName = 'N/A';
            wrapper.teamHead = 'N/A';
            wrapper.budgetAllocated = 0;
            wrapper.fiscalYear = fiscalYear;
            wrapper.budgetObjective = '';
            wrapper.expectedOutcome = '';
            wrapper.parentDepartmentalBudgetId = null;
            wrapper.goals = new List<GoalWrapper>();
            wrapper.activities = new List<ActivityWrapper>();
            wrapper.budgetUtilized = 0;
            wrapper.utilizedPercent = 0;
        }

        return wrapper;
    }

    public class TeamDetailsWrapper {
        @AuraEnabled public String teamName;
        @AuraEnabled public String teamHead;
        @AuraEnabled public Decimal budgetAllocated;
        @AuraEnabled public Decimal budgetUtilized;
        @AuraEnabled public Decimal utilizedPercent;
        @AuraEnabled public String fiscalYear;
        @AuraEnabled public Id parentDepartmentalBudgetId;
        @AuraEnabled public String departmentalBudgetStatus;
        @AuraEnabled public String budgetObjective;
        @AuraEnabled public String expectedOutcome;
        @AuraEnabled public List<GoalWrapper> goals;
        @AuraEnabled public List<ActivityWrapper> activities;
    }

    public class GoalWrapper {
        @AuraEnabled public String objective;
        @AuraEnabled public String outcome;
        public GoalWrapper(String obj, String out) {
            objective = obj;
            outcome = out;
        }
    }

    public class ActivityWrapper {
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public String expectedOutcome;
        @AuraEnabled public Decimal budget;
        @AuraEnabled public Decimal expectedRevenue;
        @AuraEnabled public Decimal approvedBudget;
        @AuraEnabled public Decimal actualRevenue;
        @AuraEnabled public Date tentativeDate;
        @AuraEnabled public String formattedDate;
        @AuraEnabled public String teamMember;

        public ActivityWrapper(Proposal__c p) {
            id = p.Id;
            name = p.Name;
            expectedOutcome = p.Expected_Outcome__c;
            budget = p.Budget__c;
            expectedRevenue = p.Expected_Revenue__c;
            approvedBudget = p.Approved_Budget__c;
            actualRevenue = p.Actual_Revenue__c;
            tentativeDate = p.Tentative_Date__c;
            teamMember = p.Team_Member__r != null ? p.Team_Member__r.Name : 'N/A';
            formattedDate = p.Tentative_Date__c != null
                ? p.Tentative_Date__c.day() + '/' + p.Tentative_Date__c.month() + '/' + p.Tentative_Date__c.year()
                : '';
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<ScheduleWrapper> getUpcomingSchedules(Id teamId, String fiscalYear) {
        List<ScheduleWrapper> schedules = new List<ScheduleWrapper>();

        try {
            List<Departmental_Budget__c> teamBudgets = [
                SELECT Id
                FROM Departmental_Budget__c
                WHERE Department__c = :teamId
                  AND Parent_Departmental_Budget__c != null
                  AND Parent_Departmental_Budget__r.Yearly_Budget__r.Fiscal_Year__c = :fiscalYear
                ORDER BY CreatedDate DESC
                LIMIT 1
            ];

            if (!teamBudgets.isEmpty()) {
                Id deptBudgetId = teamBudgets[0].Id;

                List<Proposal__c> proposals = [
                    SELECT Id, Name, Tentative_Date__c
                    FROM Proposal__c
                    WHERE Departmental_Budget__c = :deptBudgetId
                      AND Tentative_Date__c >= :Date.today()
                    ORDER BY Tentative_Date__c ASC
                ];

                for (Proposal__c p : proposals) {
                    ScheduleWrapper s = new ScheduleWrapper();
                    s.id = p.Id;
                    s.name = p.Name;
                    s.formattedDate = p.Tentative_Date__c != null
                        ? p.Tentative_Date__c.format()
                        : '';
                    schedules.add(s);
                }
            }
        } catch (Exception ex) {
            System.debug('Error in getUpcomingSchedules: ' + ex.getMessage());
        }

        return schedules;
    }

    public class ScheduleWrapper {
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public String formattedDate;
    }

    @AuraEnabled
    public static void updateProposals(List<Map<String, Object>> updatedProposals) {
        List<Proposal__c> proposalsToUpdate = new List<Proposal__c>();

        try {
            for (Map<String, Object> item : updatedProposals) {
                if (item.containsKey('id')) {
                    Proposal__c proposal = new Proposal__c(Id = (Id)item.get('id'));

                    if (item.containsKey('approvedBudget')) {
                        Object approvedValue = item.get('approvedBudget');
                        if (approvedValue != null && String.valueOf(approvedValue).trim() != '') {
                            proposal.Approved_Budget__c = Decimal.valueOf(String.valueOf(approvedValue));
                        }
                    }
                    if (item.containsKey('actualRevenue')) {
                        Object actualValue = item.get('actualRevenue');
                        if (actualValue != null && String.valueOf(actualValue).trim() != '') {
                            proposal.Actual_Revenue__c = Decimal.valueOf(String.valueOf(actualValue));
                        }
                    }
                    proposalsToUpdate.add(proposal);
                }
            }
            if (!proposalsToUpdate.isEmpty()) {
                update proposalsToUpdate;
            }
        } catch (Exception ex) {
            System.debug('Error in updateProposals: ' + ex.getMessage());
        }
    }
}