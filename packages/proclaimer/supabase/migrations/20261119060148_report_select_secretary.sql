-- Allow congregation secretaries (secretary_permission.can_edit) to read
-- field-service reports, matching the app-level secretary permission that
-- gates the Branch Report page. Permissive policies are OR'd, so this extends
-- report_select_policy without rewriting it.
CREATE POLICY "report_select_secretary" ON "public"."report"
  FOR SELECT
  TO PUBLIC
  USING (EXISTS (
    SELECT 1 FROM "public"."secretary_permission" sp
    WHERE sp.auth_user_id = auth.uid()
      AND sp.congregation_id = report.congregation_id
      AND sp.can_edit = true
  ));
