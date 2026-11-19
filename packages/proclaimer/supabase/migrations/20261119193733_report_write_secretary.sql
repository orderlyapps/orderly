-- Allow congregation secretaries (secretary_permission.can_edit) to file,
-- edit, and remove field-service reports, matching the app-level secretary
-- permission that gates the Branch Report page and report edit modal.
-- Permissive policies are OR'd, so these extend report_insert_policy,
-- report_update_policy, and report_delete_policy without rewriting them.
-- Rows stay visible to secretaries via report_select_secretary, which
-- UPDATE/DELETE also rely on.
CREATE POLICY "report_insert_secretary" ON "public"."report"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (EXISTS (
    SELECT 1 FROM "public"."secretary_permission" sp
    WHERE sp.auth_user_id = auth.uid()
      AND sp.congregation_id = report.congregation_id
      AND sp.can_edit = true
  ));

CREATE POLICY "report_update_secretary" ON "public"."report"
  FOR UPDATE
  TO PUBLIC
  USING (EXISTS (
    SELECT 1 FROM "public"."secretary_permission" sp
    WHERE sp.auth_user_id = auth.uid()
      AND sp.congregation_id = report.congregation_id
      AND sp.can_edit = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "public"."secretary_permission" sp
    WHERE sp.auth_user_id = auth.uid()
      AND sp.congregation_id = report.congregation_id
      AND sp.can_edit = true
  ));

CREATE POLICY "report_delete_secretary" ON "public"."report"
  FOR DELETE
  TO PUBLIC
  USING (EXISTS (
    SELECT 1 FROM "public"."secretary_permission" sp
    WHERE sp.auth_user_id = auth.uid()
      AND sp.congregation_id = report.congregation_id
      AND sp.can_edit = true
  ));
