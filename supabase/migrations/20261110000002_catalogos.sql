-- Catálogo de especialidades quirúrgicas y subespecialidades.

with esp(name, position) as (
  values
    ('Cirugía General', 1),
    ('Cirugía Plástica y Reconstructiva', 2),
    ('Cirugía Pediátrica', 3),
    ('Cirugía Cardiotorácica', 4),
    ('Angiología y Cirugía Vascular', 5),
    ('Urología', 6),
    ('Neurocirugía', 7),
    ('Ortopedia y Traumatología', 8),
    ('Cirugía Oncológica', 9),
    ('Otorrinolaringología y Cirugía de Cabeza y Cuello', 10),
    ('Ginecología y Obstetricia', 11)
)
insert into public.specialties (name, position)
select name, position from esp;

with sub(parent, name, position) as (
  values
    ('Cirugía General', 'Cirugía Bariátrica y Metabólica', 1),
    ('Cirugía General', 'Cirugía Colorrectal', 2),
    ('Cirugía General', 'Cirugía Hepatopancreatobiliar', 3),
    ('Cirugía General', 'Cirugía de Mínima Invasión', 4),
    ('Cirugía General', 'Cirugía Oncológica', 5),
    ('Cirugía General', 'Trasplantes', 6),
    ('Cirugía General', 'Trauma y Cirugía de Urgencias', 7),
    ('Cirugía General', 'Cirugía Endocrina', 8),
    ('Cirugía General', 'Cirugía de Mama', 9),
    ('Cirugía General', 'Pared Abdominal', 10),
    ('Cirugía General', 'Cirugía Esofagogástrica', 11),
    ('Cirugía General', 'Endoscopia Quirúrgica', 12),
    ('Cirugía General', 'Cuidados Intensivos Quirúrgicos', 13),
    ('Cirugía Plástica y Reconstructiva', 'Cirugía de Mano', 1),
    ('Cirugía Plástica y Reconstructiva', 'Microcirugía', 2),
    ('Cirugía Plástica y Reconstructiva', 'Quemados', 3),
    ('Cirugía Plástica y Reconstructiva', 'Cirugía Craneofacial', 4),
    ('Cirugía Cardiotorácica', 'Cirugía Cardiaca', 1),
    ('Cirugía Cardiotorácica', 'Cirugía de Tórax', 2),
    ('Urología', 'Urología Oncológica', 1),
    ('Urología', 'Endourología', 2),
    ('Neurocirugía', 'Cirugía de Columna', 1),
    ('Neurocirugía', 'Neurocirugía Vascular', 2),
    ('Ortopedia y Traumatología', 'Cirugía de Columna', 1),
    ('Ortopedia y Traumatología', 'Artroscopia', 2),
    ('Ortopedia y Traumatología', 'Reemplazo Articular', 3)
)
insert into public.specialties (name, parent_id, position)
select s.name, p.id, s.position
from sub s join public.specialties p on p.name = s.parent and p.parent_id is null;

-- Congresos iniciales. Fechas tomadas de fuentes públicas al 10 nov 2026.
-- confirmed = false indica que la fecha proviene de una fuente no oficial.

create or replace function public._sp(n text) returns smallint
language sql stable as $$ select id from public.specialties where name = n order by parent_id nulls first limit 1 $$;

insert into public.congresses
  (name, acronym, society, specialty_id, city, country, start_date, end_date, abstract_deadline, url, confirmed, created_by)
values
  ('Congreso Internacional de Cirugía General', 'AMCG 2026', 'Asociación Mexicana de Cirugía General',
   public._sp('Cirugía General'), 'Veracruz', 'México', '2026-10-25', '2026-10-30', null,
   'https://amcg.org.mx', true, null),
  ('SAGES Annual Meeting', 'SAGES 2027', 'Society of American Gastrointestinal and Endoscopic Surgeons',
   (select id from public.specialties where name = 'Cirugía de Mínima Invasión'), 'Las Vegas', 'Estados Unidos',
   '2027-04-06', '2027-04-09', '2026-09-11', 'https://www.sages.org/meetings/abstracts/', true, null),
  ('E-AHPBA Biennial Congress', 'E-AHPBA 2027', 'European African Hepato-Pancreato-Biliary Association',
   (select id from public.specialties where name = 'Cirugía Hepatopancreatobiliar'), 'Hamburgo', 'Alemania',
   '2027-06-02', '2027-06-04', null, 'https://www.ihpba.org/20_Regional-Meetings.html', true, null),
  ('EAES International Congress', 'EAES 2027', 'European Association for Endoscopic Surgery',
   (select id from public.specialties where name = 'Cirugía de Mínima Invasión'), 'Düsseldorf', 'Alemania',
   '2027-06-15', '2027-06-18', null, 'https://eaes.eu', true, null),
  ('ASMBS Annual Meeting', 'ASMBS 2027', 'American Society for Metabolic and Bariatric Surgery',
   (select id from public.specialties where name = 'Cirugía Bariátrica y Metabólica'), 'Orlando', 'Estados Unidos',
   '2027-06-27', '2027-07-01', null, 'https://asmbs.org/professional-education/annual-meeting', false, null),
  ('ACS Clinical Congress', 'ACS 2027', 'American College of Surgeons',
   public._sp('Cirugía General'), 'San Diego', 'Estados Unidos', '2027-10-16', '2027-10-19', null,
   'https://www.facs.org/for-medical-professionals/conferences-and-meetings/clinical-congress-2027/', true, null);

drop function public._sp(text);
