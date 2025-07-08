## Generate Release notes. 

You will generate a new set of release notes for the user. These notes will be based on inspecting the git 
history of the project since the tag $ARGUMENTS was created. You will put these notes in the `/release` directory
as a markdown file. 

#### Steps 
1. Examine the git history up to the tag $ARGUMENTS 
2. Create a new release notes file under the `/release` directory. Call the file `release-<next semantic tag>.md` 
2. Using the information you get from the git history produce high level release notes in the markdown file.
3. Review the release notes to make sure they are appropriate for a user of the software and do not contain 
  overly technical details. 
