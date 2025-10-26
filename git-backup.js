$ node git-backup.js --pa=/c/_projects/p23_fb_hub/fb_hub --pa=/c/_projects/p20_shared_component/shared --pa=/c/_projects/p27_wordguess/wordguess

[MANAGER] Processing project operations...
  [SKIP] Operation 1: Already in list - C:/_projects/p23_fb_hub/fb_hub
  [ERROR] Operation 2: Cannot add C:/_projects/p20_shared_component/shared - Path does not exist
  [SKIP] Operation 3: Already in list - C:/_projects/p27_wordguess/wordguess

[MANAGER] ERRORS DETECTED - No changes will be made to project list
[MANAGER] Please fix the errors and try again
[MANAGER] Current project list remains unchanged with 2 project(s)

[ERROR] Failed with 1 error(s): Operation 2: C:/_projects/p20_shared_component/shared - Path does not exist

$ echo $?
1