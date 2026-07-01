import type { RegistrationPersonInput } from '@/lib/schemas'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validatePerson(person: RegistrationPersonInput) {
  const errors: Partial<Record<keyof RegistrationPersonInput, string>> = {}

  if (!person.nombreCompleto.trim()) {
    errors.nombreCompleto = 'Nombre requerido'
  }
  if (!person.telefono.trim()) {
    errors.telefono = 'Teléfono requerido'
  }
  if (!person.curp.trim()) {
    errors.curp = 'CURP requerida'
  } else if (person.curp.length !== 18) {
    errors.curp = `La CURP debe tener 18 caracteres (tienes ${person.curp.length})`
  }
  if (!person.email.trim()) {
    errors.email = 'Correo requerido'
  } else if (!EMAIL_RE.test(person.email)) {
    errors.email = 'Correo inválido'
  }
  if (!person.puesto.trim()) {
    errors.puesto = 'Puesto requerido'
  }

  return errors
}

export function arePersonsValid(persons: RegistrationPersonInput[]) {
  return persons.length > 0 && persons.every((p) => Object.keys(validatePerson(p)).length === 0)
}

export function listPersonValidationIssues(persons: RegistrationPersonInput[]) {
  return persons.flatMap((person, index) =>
    Object.values(validatePerson(person)).map((msg) => `Persona ${index + 1}: ${msg}`),
  )
}
