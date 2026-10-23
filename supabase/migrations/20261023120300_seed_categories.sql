insert into public.categories (slug, name, description, sort_order) values
  ('rp-visa', 'RP & Visa', 'Residence permit, visa appointments and the Ausländerbehörde.', 10),
  ('courses', 'Courses', 'Study programmes, exams, enrolment and university admin.', 20),
  ('accommodation', 'Accommodation', 'Finding a room, dorms, contracts and Anmeldung.', 30),
  ('jobs', 'Jobs', 'Student jobs, Werkstudent positions, internships and careers.', 40),
  ('first-steps', 'First Steps', 'Arriving in Erlangen or Nuremberg: banking, insurance, SIM, transport.', 50),
  ('other', 'Other', 'Everything else.', 60)
on conflict (slug) do nothing;
