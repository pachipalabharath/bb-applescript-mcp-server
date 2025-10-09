(*
	Create BBEdit Notebook
	Creates a new notebook with optional initial content
	
	Template Variables:
		${name} - Notebook name (required)
		${location} - Save location (optional, default: ~/Documents/BBEdit Notebooks/)
		${contentJson} - JSON array of content items (optional)
		${shouldOpen} - Whether to open the notebook after creation (optional, default: true)
*)

tell application "BBEdit"
	-- Create the notebook
	set newNotebook to make new notebook with properties {name:${name}}
	
	-- Add content if provided
	set contentItems to ${contentJson}
	if contentItems is not missing value and contentItems is not "[]" then
		repeat with contentItem in contentItems
			-- contentItem should be a record with 'type' and 'data' properties
			-- For now, we'll handle this in a future iteration
			-- This is a placeholder for content addition logic
		end repeat
	end if
	
	-- Save the notebook if location is specified
	set saveLocation to ${location}
	if saveLocation is not missing value and saveLocation is not "" then
		try
			set saveFolder to POSIX file saveLocation as alias
			set notebookPath to (saveFolder as text) & (name of newNotebook) & ".bbeditnotebook"
			save newNotebook to file notebookPath
		on error errMsg
			-- If save fails, continue without saving
			-- The notebook will remain in memory
		end try
	end if
	
	-- Get the notebook path (if saved) or name
	set notebookInfo to name of newNotebook
	try
		set notebookFile to file of newNotebook
		if notebookFile is not missing value then
			set notebookInfo to POSIX path of notebookFile
		end if
	end try
	
	-- Optionally open the notebook
	set shouldOpenNotebook to ${shouldOpen}
	if shouldOpenNotebook is missing value or shouldOpenNotebook is true then
		-- Notebook is already open when created
		activate
	else
		-- Close the notebook window if user doesn't want it open
		try
			close window 1
		end try
	end if
	
	-- Return success with notebook info
	return "{\"success\":true,\"notebookName\":\"" & (name of newNotebook) & "\",\"notebookPath\":\"" & notebookInfo & "\"}"
end tell
