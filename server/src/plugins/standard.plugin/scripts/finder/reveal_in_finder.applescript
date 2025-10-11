(*
	Reveal in Finder
	Reveals and selects one or more files/folders in Finder
	
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
	
	set revealedItems to {}
	set failedPaths to {}
	
	tell application "Finder"
		activate
		
		repeat with filePath in cleanPaths
			set filePath to filePath as text
			try
				set fileItem to POSIX file filePath as alias
				reveal fileItem
				-- don't need both reveal and select - opens folder twice. 
				--select fileItem
				set end of revealedItems to filePath
			on error errMsg
				set end of failedPaths to filePath & " (" & errMsg & ")"
			end try
		end repeat
	end tell
	
	-- Build result
	set resultMsg to "Revealed " & (count of revealedItems) & " of " & (count of cleanPaths) & " items in Finder"
	if (count of failedPaths) > 0 then
		set AppleScript's text item delimiters to ", "
		set resultMsg to resultMsg & ". Failed: " & (failedPaths as text)
		set AppleScript's text item delimiters to ""
	end if
	
	return resultMsg
end run
