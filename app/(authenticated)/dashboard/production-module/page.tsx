'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Group,
  RingProgress,
  Button,
  Loader,
  Center,
  Table,
  Badge,
  ThemeIcon,
  Grid,
} from '@mantine/core';
import {
  IconBuildingFactory2,
  IconCheck,
  IconChevronRight,
  IconChartBar,
  IconChartPie,
  IconFlask,
  IconRefresh,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import type { Production, Product } from '@/types/collections';

const BASE = '/api/items';

export default function ProductionsDashboardPage() {
  useSetModuleTitle('Productions Dashboard');
  const router = useRouter();

  const [productions, setProductions] = useState<Production[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const prodRes = await fetch(`${BASE}/productions?limit=200&sort=-created_at`);
      const prodJson = await prodRes.json();
      setProductions(prodJson.data ?? []);

      const productRes = await fetch(`${BASE}/products?limit=200`);
      const productJson = await productRes.json();
      setProducts(productJson.data ?? []);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Center style={{ height: '70vh' }}>
        <Loader size="xl" color="teal" />
      </Center>
    );
  }

  // ────────────────────────────────────────────────────────────
  // Analisis Data Produksi
  // ────────────────────────────────────────────────────────────
  const totalBatches = productions.length;
  const inProgressBatches = productions.filter((p) => p.status === 'IN_PROGRESS').length;
  const scheduledBatches = productions.filter((p) => p.status === 'SCHEDULED').length;
  const completedBatches = productions.filter((p) => p.status === 'COMPLETED');
  const completedCount = completedBatches.length;

  // Hitung yield rate rata-rata (actual_quantity / planned_quantity)
  let avgYieldRate = 0;
  if (completedCount > 0) {
    const totalYield = completedBatches.reduce((acc, curr) => {
      const planned = curr.planned_quantity || 1;
      const actual = curr.actual_quantity ?? planned;
      return acc + (actual / planned) * 100;
    }, 0);
    avgYieldRate = Math.round(totalYield / completedCount);
  }

  // Hitung status counts untuk Chart
  const statusCounts = {
    SCHEDULED: productions.filter((p) => p.status === 'SCHEDULED').length,
    IN_PROGRESS: productions.filter((p) => p.status === 'IN_PROGRESS').length,
    COMPLETED: productions.filter((p) => p.status === 'COMPLETED').length,
    CANCELLED: productions.filter((p) => p.status === 'CANCELLED').length,
  };

  // Nama Produk Lookup
  const getProductName = (pid: string) => {
    const p = products.find((x) => x.id === pid);
    return p ? p.type : pid;
  };

  // Recent productions limit to 5
  const recentProductions = productions.slice(0, 5);

  const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: 'blue',
    IN_PROGRESS: 'yellow',
    COMPLETED: 'teal',
    CANCELLED: 'red',
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1} fw={700}>Productions Dashboard</Title>
            <Text c="dimmed" size="sm">
              Real-time monitoring, metrics analysis, and yield optimization
            </Text>
          </div>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            color="teal"
            onClick={fetchData}
          >
            Refresh Data
          </Button>
        </Group>

        {/* 4 KPI Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">Total Production Batches</Text>
                <Title order={2} mt={4}>{totalBatches}</Title>
              </div>
              <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                <IconBuildingFactory2 size={20} />
              </ThemeIcon>
            </Group>
            <Text size="xs" c="dimmed" mt="xs">
              All registered production lots
            </Text>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">In Progress Batches</Text>
                <Title order={2} mt={4} c="yellow.6">{inProgressBatches}</Title>
              </div>
              <ThemeIcon size="lg" radius="md" variant="light" color="yellow">
                <IconFlask size={20} />
              </ThemeIcon>
            </Group>
            <Text size="xs" c="dimmed" mt="xs">
              {scheduledBatches} batches scheduled next
            </Text>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">Average Yield Efficiency</Text>
                <Title order={2} mt={4} c="teal.6">{completedCount > 0 ? `${avgYieldRate}%` : '—'}</Title>
              </div>
              <ThemeIcon size="lg" radius="md" variant="light" color="teal">
                <IconCheck size={20} />
              </ThemeIcon>
            </Group>
            <Text size="xs" c="dimmed" mt="xs">
              Based on {completedCount} completed batches
            </Text>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">Product Catalog</Text>
                <Title order={2} mt={4}>{products.length}</Title>
              </div>
              <RingProgress
                size={60}
                roundCaps
                thickness={6}
                sections={[{ value: 100, color: 'teal' }]}
              />
            </Group>
            <Text size="xs" c="dimmed" mt="xs">
              Active essential products
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Charts & Analytics Section */}
        <Grid gutter="md">
          {/* Output Yield Chart (Planned vs Actual) */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Paper p="lg" radius="md" withBorder h="100%">
              <Stack gap="md" h="100%">
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconChartBar size={20} className="text-teal-600" />
                    <Title order={3} size="h4">Production Output Yield</Title>
                  </Group>
                  <Group gap="xs">
                    <Badge variant="dot" color="blue">Planned Qty</Badge>
                    <Badge variant="dot" color="teal">Actual Qty</Badge>
                  </Group>
                </Group>
                <Text c="dimmed" size="xs">Planned vs Actual Output (in units) for the last 5 completed batches</Text>

                <div style={{ flex: 1, minHeight: 220, display: 'flex', alignItems: 'flex-end', gap: '30px', paddingBottom: '20px', paddingTop: '10px' }}>
                  {completedBatches.slice(0, 5).reverse().map((batch, index) => {
                    const maxVal = Math.max(...completedBatches.slice(0, 5).map(b => Math.max(b.planned_quantity, b.actual_quantity ?? 0))) || 1;
                    const planHeight = `${(batch.planned_quantity / maxVal) * 80}%`;
                    const actualHeight = `${((batch.actual_quantity ?? 0) / maxVal) * 80}%`;
                    return (
                      <div key={batch.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center', alignItems: 'flex-end', height: '180px' }}>
                          {/* Planned Bar */}
                          <div style={{
                            width: '20px',
                            height: planHeight,
                            backgroundColor: 'var(--mantine-color-blue-3)',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.3s ease',
                            position: 'relative'
                          }}>
                            <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: 'bold' }}>
                              {batch.planned_quantity}
                            </div>
                          </div>
                          {/* Actual Bar */}
                          <div style={{
                            width: '20px',
                            height: actualHeight,
                            backgroundColor: 'var(--mantine-color-teal-5)',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.3s ease',
                            position: 'relative'
                          }}>
                            <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: 'bold', color: 'var(--mantine-color-teal-7)' }}>
                              {batch.actual_quantity ?? '—'}
                            </div>
                          </div>
                        </div>
                        <Text size="xs" fw={700} mt="xs" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100px' }}>
                          {batch.lot_number ?? `Lot ${index + 1}`}
                        </Text>
                        <Text size="xxs" c="dimmed" style={{ fontSize: '10px' }}>
                          {getProductName(batch.products_id)}
                        </Text>
                      </div>
                    );
                  })}
                  {completedBatches.length === 0 && (
                    <Center style={{ width: '100%', height: '100%' }}>
                      <Text c="dimmed">No completed production batches to show.</Text>
                    </Center>
                  )}
                </div>
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Status Breakdown Donut Chart */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" radius="md" withBorder h="100%">
              <Stack gap="md" align="center" justify="space-between" h="100%">
                <Group gap="xs" style={{ width: '100%' }}>
                  <IconChartPie size={20} className="text-teal-600" />
                  <Title order={3} size="h4">Status Breakdown</Title>
                </Group>

                {totalBatches > 0 ? (
                  <>
                    <RingProgress
                      size={180}
                      thickness={16}
                      roundCaps
                      sections={[
                        { value: (statusCounts.COMPLETED / totalBatches) * 100, color: 'teal', tooltip: `Completed: ${statusCounts.COMPLETED}` },
                        { value: (statusCounts.IN_PROGRESS / totalBatches) * 100, color: 'yellow', tooltip: `In Progress: ${statusCounts.IN_PROGRESS}` },
                        { value: (statusCounts.SCHEDULED / totalBatches) * 100, color: 'blue', tooltip: `Scheduled: ${statusCounts.SCHEDULED}` },
                        { value: (statusCounts.CANCELLED / totalBatches) * 100, color: 'red', tooltip: `Cancelled: ${statusCounts.CANCELLED}` },
                      ]}
                    />

                    <Stack gap="xs" style={{ width: '100%' }}>
                      <Group justify="space-between">
                        <Group gap="xs">
                          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--mantine-color-teal-6)' }} />
                          <Text size="sm">Completed</Text>
                        </Group>
                        <Text size="sm" fw={700}>{statusCounts.COMPLETED}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Group gap="xs">
                          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--mantine-color-yellow-6)' }} />
                          <Text size="sm">In Progress</Text>
                        </Group>
                        <Text size="sm" fw={700}>{statusCounts.IN_PROGRESS}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Group gap="xs">
                          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--mantine-color-blue-6)' }} />
                          <Text size="sm">Scheduled</Text>
                        </Group>
                        <Text size="sm" fw={700}>{statusCounts.SCHEDULED}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Group gap="xs">
                          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--mantine-color-red-6)' }} />
                          <Text size="sm">Cancelled</Text>
                        </Group>
                        <Text size="sm" fw={700}>{statusCounts.CANCELLED}</Text>
                      </Group>
                    </Stack>
                  </>
                ) : (
                  <Center style={{ height: 150 }}>
                    <Text c="dimmed">No status data to display.</Text>
                  </Center>
                )}
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Active / Recent Production Batches Table */}
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Title order={3}>Recent Production Activity</Title>
                <Text c="dimmed" size="xs">Detailed log of the most recently initiated production batches</Text>
              </div>
              <Button
                variant="subtle"
                rightSection={<IconChevronRight size={16} />}
                onClick={() => router.push('/dashboard/production-module/production')}
              >
                Manage Productions
              </Button>
            </Group>

            {recentProductions.length === 0 ? (
              <Center py="xl">
                <Text c="dimmed">No production data found.</Text>
              </Center>
            ) : (
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Lot Number</Table.Th>
                    <Table.Th>Product</Table.Th>
                    <Table.Th>Scheduled Date</Table.Th>
                    <Table.Th>Planned Qty</Table.Th>
                    <Table.Th>Actual Qty</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th style={{ width: 80 }}>Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {recentProductions.map((prod) => (
                    <Table.Tr key={prod.id}>
                      <Table.Td>
                        <Text fw={600} ff="monospace" size="sm">
                          {prod.lot_number ?? '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td>{getProductName(prod.products_id)}</Table.Td>
                      <Table.Td>{prod.scheduled_date}</Table.Td>
                      <Table.Td>{prod.planned_quantity} units</Table.Td>
                      <Table.Td>{prod.actual_quantity !== undefined ? `${prod.actual_quantity} units` : '—'}</Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={STATUS_COLORS[prod.status]} size="sm">
                          {prod.status.replace('_', ' ')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Button
                          variant="light"
                          size="xs"
                          color="teal"
                          onClick={() => router.push(`/dashboard/production-module/production/${prod.id}`)}
                        >
                          Detail
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
