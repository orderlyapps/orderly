-- Allow congregation secretaries (secretary_permission.can_edit) to read
-- meeting attendance, matching the app-level secretary permission that gates
-- the Branch Report page. Permissive policies are OR'd, so this extends
-- meeting_attendance_select without rewriting it.
CREATE POLICY "meeting_attendance_select_secretary" ON "public"."meeting_attendance"
  FOR SELECT
  TO PUBLIC
  USING (EXISTS (
    SELECT 1 FROM "public"."secretary_permission" sp
    WHERE sp.auth_user_id = auth.uid()
      AND sp.congregation_id = meeting_attendance.congregation_id
      AND sp.can_edit = true
  ));
