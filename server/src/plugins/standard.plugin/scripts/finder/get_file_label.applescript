(*
	Get Finder Label Color
	Gets the label color for one or more files/folders
	
	Parameters:
		pathsJson - JSON array of file/folder paths
*)

on run argv
	if (count of argv) < 1 then
		return "Error: Missing required parameter (paths)"
	end if
	
	set pathsJson to item 1 of argv
	
	-- Parse paths from JSON
	set filePaths to {}
	if pathsJson contains "," then
		set AppleScript's text item delimiters to ","
		set filePaths to text items of pathsJson
		set AppleScript's text item delimiters to ""
	else if pathsJson is not "" and pathsJson is not "[]" then
		set filePaths to {pathsJson}
	end if
	
	-- Clean paths
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
	
	set resultList to {}
	
	tell application "Finder"
		repeat with filePath in cleanPaths
			set filePath to filePath as text
			try
				set fileItem to POSIX file filePath as alias
				set labelIdx to label index of fileItem
				set labelName to ""
				
				-- Map index to name
				if labelIdx is 0 then
					set labelName to "None"
				else if labelIdx is 1 then
					set labelName to "Red"
				else if labelIdx is 2 then
					set labelName to "Orange"
				else if labelIdx is 3 then
					set labelName to "Yellow"
				else if labelIdx is 4 then
					set labelName to "Green"
				else if labelIdx is 5 then
					set labelName to "Blue"
				else if labelIdx is 6 then
					set labelName to "Purple"
				else if labelIdx is 7 then
					set labelName to "Gray"
				end if
				
				set resultEntry to "{\"path\":\"" & filePath & "\",\"labelIndex\":" & labelIdx & ",\"labelName\":\"" & labelName & "\"}"
				set end of resultList to resultEntry
			on error errMsg
				set resultEntry to "{\"path\":\"" & filePath & "\",\"error\":\"" & errMsg & "\"}"
				set end of resultList to resultEntry
			end try
		end repeat
	end tell
	
	-- Build JSON result
	set AppleScript's text item delimiters to ","
	set resultJson to "[" & (resultList as text) & "]"
	set AppleScript's text item delimiters to ""
	
	return resultJson
end run
