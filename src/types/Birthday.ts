export interface Birthday {
  id: string
  name: string
  date: string // formato YYYY-MM-DD gregoriano (fecha real de nacimiento)
  calendar: 'gregorian' | 'hebrew'  // cómo calcular el próximo aniversario anual
}
