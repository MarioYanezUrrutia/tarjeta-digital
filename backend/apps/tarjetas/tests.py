from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.tarjetas.models import Cliente, Tarjeta


class TarjetaLimiteTestCase(TestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(
            origen='kabymur',
            nombre='Cliente Prueba',
            email='cliente@example.com',
        )

    def _crear_tarjeta(self, numero):
        return Tarjeta(
            cliente=self.cliente,
            tipo='persona',
            plan='kabymur_basico',
            nombre_mostrado=f'Tarjeta Prueba {numero}',
        )

    def test_permite_hasta_tres_tarjetas_por_cliente(self):
        for i in range(1, 4):
            tarjeta = self._crear_tarjeta(i)
            tarjeta.save()
            self.assertIsNotNone(tarjeta.pk)

        self.assertEqual(self.cliente.tarjetas.count(), 3)

    def test_rechaza_cuarta_tarjeta_por_cliente(self):
        for i in range(1, 4):
            self._crear_tarjeta(i).save()

        with self.assertRaises(ValidationError):
            self._crear_tarjeta(4).save()

        self.assertEqual(self.cliente.tarjetas.count(), 3)
