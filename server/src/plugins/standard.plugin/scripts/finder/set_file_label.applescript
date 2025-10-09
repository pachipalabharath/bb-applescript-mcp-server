(*
	Set Finder Label Color
	Sets the label color for one or more files/folders
	
	Parameters:
		pathsJson - JSON array of file/folder paths
		labelIndex - Label index (0=None, 1=Red, 2=Orange, 3=Yellow, 4=Green, 5=Blue, 6=Purple, 7=Gray)
*)

on run argv
	if (count of argv) < 2 then
		return "Error: Missing required parameters (paths, labelIndex)"
	end if
	
	set pathsJson to item 1 of argv
	set labelIndex to item 2 of argv as integer
	
	-- Validate label index
	if labelIndex < 0 or labelIndex > 7 then
		return "Error: Label index must be between 0 and 7"
	end if
	
	-- Parse paths from JSON
	set filePaths to {}
	if pathsJson contains "," then
		set AppleScript's text item delimiters to ","
		set filePaths to text items of pathsJson
		set AppleScript's text item delimiters to ""
	else if pathsJson is not "" and pathsJson is not "[]" then
		set filePaths to {pathsJson}
	end if
	
	-- Clean paths (remove quotes, brackets)
	set cleanPaths to {}
	repeat with filePath in filePaths
		set filePath to filePath as text
		if filePath starts with "[" then set filePath to text 2 thru -2 of filePath
		if filePath starts with "\"" then set filePath to text 2 thru -2 of filePath
		if filePath is not "" then
			set end of cleanPaths to filePath
		end if
	end repeat
	
	if (count of cleanPaths) is 0 then
		return "Error: No valid paths provided"
	end if
	
	set successCount to 0
	set failedPaths to {}
	
	tell application "Finder"
		repeat with filePath in cleanPaths
			set filePath to filePath as text
			try
				set fileItem to POSIX file filePath as alias
				set label index of fileItem to labelIndex
				set successCount to successCount + 1
			on error errMsg
				set end of failedPaths to filePath & " (" & errMsg & ")"
			end try
		end repeat
	end tell
	
	-- Build result
	set resultMsg to "Successfully set label for " & successCount & " of " & (count of cleanPaths) & " items"
	if (count of failedPaths) > 0 then
		set AppleScript's text item delimiters to ", "
		set resultMsg to resultMsg & ". Failed: " & (failedPaths as text)
		set AppleScript's text item delimiters to ""
	end if
	
	return resultMsg
end run
