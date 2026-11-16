CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE estado_cita AS ENUM ('reservada', 'completada', 'cancelada', 'no_asistida');

CREATE TABLE clinica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  clave_hash text NOT NULL
);

CREATE TABLE profesional (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinica (id),
  nombre text NOT NULL,
  especialidad text NOT NULL,
  UNIQUE (id, clinica_id)
);

CREATE TABLE servicio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinica (id),
  nombre text NOT NULL,
  duracion_min integer NOT NULL CHECK (duracion_min > 0),
  importe_centimos integer NOT NULL CHECK (importe_centimos >= 0),
  UNIQUE (id, clinica_id)
);

CREATE TABLE paciente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinica (id),
  nombre text NOT NULL,
  telefono text NOT NULL,
  email text NOT NULL,
  UNIQUE (id, clinica_id)
);

CREATE TABLE cita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinica (id),
  profesional_id uuid NOT NULL,
  servicio_id uuid NOT NULL,
  paciente_id uuid NOT NULL,
  inicio timestamptz NOT NULL,
  fin timestamptz NOT NULL,
  estado estado_cita NOT NULL DEFAULT 'reservada',
  creada_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cita_fin_posterior CHECK (fin > inicio),
  -- Integridad de clínica (FR-024): profesional, servicio y paciente pertenecen a la clínica de la cita.
  CONSTRAINT cita_profesional_clinica FOREIGN KEY (profesional_id, clinica_id) REFERENCES profesional (id, clinica_id),
  CONSTRAINT cita_servicio_clinica FOREIGN KEY (servicio_id, clinica_id) REFERENCES servicio (id, clinica_id),
  CONSTRAINT cita_paciente_clinica FOREIGN KEY (paciente_id, clinica_id) REFERENCES paciente (id, clinica_id),
  -- Garantía del principio III: sin solapes por profesional entre citas que ocupan hueco.
  CONSTRAINT cita_sin_solape EXCLUDE USING gist (
    profesional_id WITH =,
    tstzrange(inicio, fin, '[)') WITH &&
  ) WHERE (estado IN ('reservada', 'completada'))
);

CREATE INDEX cita_clinica_inicio_idx ON cita (clinica_id, inicio);

-- Finales inmutables (FR-007): defensa en profundidad; la regla primaria vive en el dominio.
CREATE FUNCTION cita_estado_final_inmutable() RETURNS trigger AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado AND OLD.estado <> 'reservada' THEN
    RAISE EXCEPTION 'La cita ya está cerrada y no se puede modificar' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cita_estado_final_inmutable
  BEFORE UPDATE ON cita
  FOR EACH ROW EXECUTE FUNCTION cita_estado_final_inmutable();
