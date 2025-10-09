(*
	Get Finder Selection
	Returns the currently selected items in Finder
	
	No parameters required
*)

on run
	try
		tell application "Finder"
			set selectedItems to selection
			
			if (count of selectedItems) is 0 then
				return "{\"count\":0,\"items\":[]}"
			end if
			
			set resultList to {}
			
			repeat with selectedItem in selectedItems
				set itemPath to POSIX path of (selectedItem as alias)
				set itemName to name of selectedItem
				set itemKind to kind of selectedItem
				
				-- Check if folder
				set isFolder to false
				try
					set folderTest to folder selectedItem
					set isFolder to true
				end try
				
				set resultEntry to "{" & ¬
					"\"path\":\"" & itemPath & "\"," & ¬
					"\"name\":\"" & itemName & "\"," & ¬
					"\"kind\":\"" & itemKind & "\"," & ¬
					"\"isFolder\":" & (isFolder as text) & ¬
					"}"
				
				set end of resultList to resultEntry
			end repeat
			
			-- Build JSON result
			set AppleScript's text item delimiters to ","
			set resultJson to "{\"count\":" & (count of resultList) & ",\"items\":[" & (resultList as text) & "]}"
			set AppleScript's text item delimiters to ""
			
			return resultJson
		end tell
		
	on error errMsg number errNum
		return "Error (" & errNum & "): " & errMsg
	end try
end run
