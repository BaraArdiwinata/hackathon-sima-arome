'use client';

import { useState, useCallback, use } from 'react';
import {
  Container,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Table,
  Badge,
  ActionIcon,
  Modal,
  NumberInput,
  Loader,
  Center,
  Paper,
  Tooltip,
  Tabs,
  Breadcrumbs,
  Anchor,
  Select,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconPencil, IconTrash, IconArrowLeft } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import type { Recipe, CreateRecipeRequest, UpdateRecipeRequest } from '@/types/collections';
import {
  useProduct,
  useProductRecipes,
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
  useRawMaterials,
} from '../hooks';

/**
 * Product Detail Page
 * Menampilkan info produk + CRUD recipe items
 */
export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  useSetModuleTitle('Productions Module');
  const { id } = use(params);
  const router = useRouter();

  const { product, loading: productLoading } = useProduct(id);
  const { recipes, loading: recipesLoading, refetch: refetchRecipes } = useProductRecipes(id);
  const { rawMaterials } = useRawMaterials();
  const { create, loading: creating } = useCreateRecipe();
  const { update, loading: updating } = useUpdateRecipe();
  const { remove, loading: deleting } = useDeleteRecipe();

  const [editTarget, setEditTarget] = useState<Recipe | null>(null);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);

  const handleCreate = useCallback(async (data: CreateRecipeRequest) => {
    await create({ ...data, products_id: id });
    closeCreate();
    refetchRecipes();
    notifications.show({ title: 'Success', message: 'Recipe item added', color: 'teal' });
  }, [create, id, closeCreate, refetchRecipes]);

  const handleEdit = useCallback(async (data: UpdateRecipeRequest) => {
    if (!editTarget) return;
    await update(editTarget.id, data);
    closeEdit();
    refetchRecipes();
    notifications.show({ title: 'Success', message: 'Recipe item updated', color: 'teal' });
  }, [update, editTarget, closeEdit, refetchRecipes]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    closeDelete();
    refetchRecipes();
    setDeleteTarget(null);
    notifications.show({ title: 'Deleted', message: 'Recipe item removed', color: 'red' });
  }, [remove, deleteTarget, closeDelete, refetchRecipes]);

  if (productLoading) {
    return <Center py="xl"><Loader /></Center>;
  }

  if (!product) {
    return (
      <Container size="xl" py="xl">
        <Text c="dimmed">Product not found.</Text>
        <Button mt="md" variant="light" onClick={() => router.push('/dashboard/production-module/product')}>
          Back to Products
        </Button>
      </Container>
    );
  }

  const getRawMaterialName = (rmId: string) => {
    const rm = rawMaterials.find((r: { id: string; material_name: string }) => r.id === rmId);
    return rm?.material_name ?? rmId;
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Breadcrumb */}
        <Breadcrumbs>
          <Anchor onClick={() => router.push('/dashboard/production-module/product')} size="sm">
            Products
          </Anchor>
          <Text size="sm" c="dimmed">{product.type}</Text>
        </Breadcrumbs>

        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Group gap="sm">
            <ActionIcon variant="light" onClick={() => router.push('/dashboard/production-module/product')}>
              <IconArrowLeft size={18} />
            </ActionIcon>
            <div>
              <Title order={2}>{product.type}</Title>
              <Text c="dimmed" size="sm">{product.categories}</Text>
            </div>
          </Group>
        </Group>

        {/* Product Info Cards */}
        <Group grow>
          <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Category</Text>
            <Badge variant="light" color="teal" mt={4}>{product.categories}</Badge>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Price</Text>
            <Title order={4} mt={4}>Rp {product.price.toLocaleString('id-ID')}</Title>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" fw={500} tt="uppercase">Recipe Items</Text>
            <Title order={4} mt={4}>{recipes.length} ingredients</Title>
          </Paper>
        </Group>

        {/* Tabs */}
        <Tabs defaultValue="recipe">
          <Tabs.List>
            <Tabs.Tab value="recipe">Recipe / Formula</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="recipe" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={500}>Bahan Baku (Recipe Items)</Text>
                <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openCreate}>
                  Add Ingredient
                </Button>
              </Group>

              <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
                {recipesLoading ? (
                  <Center py="xl"><Loader /></Center>
                ) : recipes.length === 0 ? (
                  <Center py="xl">
                    <Stack align="center" gap="xs">
                      <Text c="dimmed" size="sm">No recipe items yet.</Text>
                      <Button variant="light" size="xs" onClick={openCreate}>Add first ingredient</Button>
                    </Stack>
                  </Center>
                ) : (
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Raw Material</Table.Th>
                        <Table.Th>Quantity (kg)</Table.Th>
                        <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {recipes.map((recipe) => (
                        <Table.Tr key={recipe.id}>
                          <Table.Td>
                            <Text fw={500}>{getRawMaterialName(recipe.raw_material_id)}</Text>
                          </Table.Td>
                          <Table.Td>{recipe.quantity} kg</Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Tooltip label="Edit">
                                <ActionIcon
                                  variant="light"
                                  color="yellow"
                                  size="sm"
                                  onClick={() => { setEditTarget(recipe); openEdit(); }}
                                >
                                  <IconPencil size={14} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Remove">
                                <ActionIcon
                                  variant="light"
                                  color="red"
                                  size="sm"
                                  onClick={() => { setDeleteTarget(recipe); openDelete(); }}
                                >
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Paper>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Create Recipe Modal */}
      <RecipeCreateModal
        opened={createOpened}
        onClose={closeCreate}
        onSubmit={handleCreate}
        loading={creating}
        rawMaterials={rawMaterials}
      />

      {/* Edit Recipe Modal */}
      <RecipeEditModal
        key={editTarget?.id ?? 'edit'}
        opened={editOpened}
        onClose={closeEdit}
        onSubmit={handleEdit}
        loading={updating}
        rawMaterials={rawMaterials}
        initialValues={editTarget ?? undefined}
      />

      {/* Delete Confirm */}
      <Modal opened={deleteOpened} onClose={closeDelete} title="Remove Ingredient" centered size="sm">
        <Stack gap="md">
          <Text>Remove <strong>{getRawMaterialName(deleteTarget?.raw_material_id ?? '')}</strong> from the recipe?</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDelete}>Cancel</Button>
            <Button color="red" loading={deleting} onClick={handleDelete}>Remove</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

// ────────────────────────────────────────────────────────────
// Recipe Form Modals
// ────────────────────────────────────────────────────────────

function RecipeCreateModal({
  opened, onClose, onSubmit, loading, rawMaterials,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRecipeRequest) => void;
  loading: boolean;
  rawMaterials: { id: string; material_name: string }[];
}) {
  const [rawMaterialId, setRawMaterialId] = useState('');
  const [quantity, setQuantity] = useState<number | string>('');

  const handleSubmit = () => {
    if (!rawMaterialId || quantity === '') return;
    // products_id injected by parent handler
    onSubmit({ products_id: '', raw_material_id: rawMaterialId, quantity: Number(quantity) });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add Ingredient" centered>
      <Stack gap="md">
        <Select
          label="Raw Material"
          placeholder="Select raw material"
          data={rawMaterials.map((rm) => ({ value: rm.id, label: rm.material_name }))}
          value={rawMaterialId}
          onChange={(val) => setRawMaterialId(val ?? '')}
          searchable
          required
        />
        <NumberInput
          label="Quantity (kg)"
          placeholder="e.g. 5"
          value={quantity}
          onChange={setQuantity}
          min={0}
          decimalScale={3}
          required
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit}>Add Ingredient</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function RecipeEditModal({
  opened, onClose, onSubmit, loading, rawMaterials, initialValues,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateRecipeRequest) => void;
  loading: boolean;
  rawMaterials: { id: string; material_name: string }[];
  initialValues?: Partial<Recipe>;
}) {
  const [rawMaterialId, setRawMaterialId] = useState(initialValues?.raw_material_id ?? '');
  const [quantity, setQuantity] = useState<number | string>(initialValues?.quantity ?? '');

  const handleSubmit = () => {
    if (!rawMaterialId || quantity === '') return;
    onSubmit({ raw_material_id: rawMaterialId, quantity: Number(quantity) });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Ingredient" centered>
      <Stack gap="md">
        <Select
          label="Raw Material"
          placeholder="Select raw material"
          data={rawMaterials.map((rm) => ({ value: rm.id, label: rm.material_name }))}
          value={rawMaterialId}
          onChange={(val) => setRawMaterialId(val ?? '')}
          searchable
          required
        />
        <NumberInput
          label="Quantity (kg)"
          placeholder="e.g. 5"
          value={quantity}
          onChange={setQuantity}
          min={0}
          decimalScale={3}
          required
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit}>Save Changes</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

