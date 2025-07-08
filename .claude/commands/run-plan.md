# Run Plan

You will execute the plan laid out in the file $ARGUMENTS. You will follow the plan
step by step. Once you've implemented the plan think critically to see if you achieved the goals laid out in the plan. If the plan appears wrong or something 
is unclear ask the user for clarification.

# Review your code 

After you've run through the plan. Use a subagent to review the code you wrote. Give the subagent the following prompt file ./.claude/commands/review-plan-implementation.md targeting the same plan file you just executed, i.e. $ARGUMENTS.

# Fix Review Feedback

After the review is complete, address any issues you found. Then go BACK to the review phase again, untill there are no more issues to address.