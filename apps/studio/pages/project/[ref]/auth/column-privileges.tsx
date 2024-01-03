import { PostgresRole } from '@supabase/postgres-meta'
import { useMemo, useState } from 'react'

import { useParams } from 'common/hooks'
import Privileges from 'components/interfaces/Database/Privileges/Privileges'
import { mapDataToPrivilegeColumnUI } from 'components/interfaces/Database/Privileges/Privileges.utils'
import { AuthLayout } from 'components/layouts'
import { useProjectContext } from 'components/layouts/ProjectLayout/ProjectContext'
import { ScaffoldContainer, ScaffoldSection } from 'components/layouts/Scaffold'
import EmptyPageState from 'components/ui/Error'
import Connecting from 'components/ui/Loading/Loading'
import { useDatabaseRolesQuery } from 'data/database-roles/database-roles-query'
import { useSchemasQuery } from 'data/database/schemas-query'
import { useColumnPrivilegesQuery } from 'data/privileges/column-privileges-query'
import { useTablePrivilegesQuery } from 'data/privileges/table-privileges-query'
import { useTablesQuery } from 'data/tables/tables-query'
import { EXCLUDED_SCHEMAS } from 'lib/constants/schemas'
import { NextPageWithLayout } from 'types'

const EDITABLE_ROLES = ['authenticated', 'anon', 'service_role']

const PrivilegesPage: NextPageWithLayout = () => {
  const pathParams = useParams()
  const { project } = useProjectContext()

  const [selectedSchema, setSelectedSchema] = useState<string>('public')
  const [selectedTable, setSelectedTable] = useState<string | undefined>(pathParams.table)
  const [selectedRole, setSelectedRole] = useState<string>('authenticated')

  const { data: tableList, isLoading: isLoadingTables } = useTablesQuery(
    {
      projectRef: project?.ref,
      connectionString: project?.connectionString,
    },
    {
      onSuccess(data) {
        const tables = data
          .filter((table) => table.schema === selectedSchema)
          .map((table) => table.name)

        if (tables[0] && selectedTable === undefined) {
          setSelectedTable(tables[0])
        }
      },
    }
  )

  const { data: allSchemas, isLoading: isLoadingSchemas } = useSchemasQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })
  const { data: allRoles, isLoading: isLoadingRoles } = useDatabaseRolesQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })

  const tables = tableList
    ?.filter((table) => table.schema === selectedSchema)
    .map((table) => table.name)

  const {
    data: allTablePrivileges,
    isLoading: isLoadingTablePrivileges,
    isError: isErrorTablePrivileges,
    error: errorTablePrivileges,
  } = useTablePrivilegesQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })

  const tablePrivileges = useMemo(
    () =>
      allTablePrivileges
        ?.find(
          (tablePrivilege) =>
            tablePrivilege.schema === selectedSchema && tablePrivilege.name === selectedTable
        )
        ?.privileges.filter((privilege) => privilege.grantee === selectedRole) ?? [],
    [allTablePrivileges, selectedRole, selectedSchema, selectedTable]
  )

  const {
    data: columnPrivileges,
    isLoading: isLoadingColumnPrivileges,
    isError: isErrorColumnPrivileges,
    error: errorColumnPrivileges,
  } = useColumnPrivilegesQuery({
    projectRef: project?.ref,
    connectionString: project?.connectionString,
  })

  const schemas = allSchemas?.filter((schema) => !EXCLUDED_SCHEMAS.includes(schema.name)) ?? []

  const rolesList =
    allRoles?.filter((role: PostgresRole) => EDITABLE_ROLES.includes(role.name)) ?? []
  const roles = rolesList.map((role: PostgresRole) => role.name)

  const handleChangeSchema = (schema: string) => {
    const newTable = tableList?.find((table) => table.schema === schema)?.name ?? ''
    setSelectedSchema(schema)
    setSelectedTable(newTable)
  }

  const handleChangeRole = (role: string) => {
    setSelectedRole(role)
  }

  const columnsState = useMemo(
    () => mapDataToPrivilegeColumnUI(columnPrivileges, selectedSchema, selectedTable, selectedRole),
    [columnPrivileges, selectedRole, selectedSchema, selectedTable]
  )

  if (isErrorTablePrivileges || isErrorColumnPrivileges) {
    return <EmptyPageState error={errorTablePrivileges || errorColumnPrivileges} />
  }

  if (
    isLoadingTablePrivileges ||
    isLoadingColumnPrivileges ||
    isLoadingTables ||
    isLoadingSchemas ||
    isLoadingRoles
  ) {
    return (
      <div className="h-full flex items-center justify-center">
        <Connecting />
      </div>
    )
  }

  const table = tableList?.find((table) => table.name === selectedTable)

  return (
    <ScaffoldContainer>
      <ScaffoldSection>
        <Privileges
          tablePrivileges={tablePrivileges}
          columns={columnsState}
          tables={tables || []}
          selectedSchema={selectedSchema}
          selectedRole={selectedRole}
          selectedTable={table}
          schemas={schemas}
          roles={roles}
          onChangeSchema={handleChangeSchema}
          onChangeRole={handleChangeRole}
          onChangeTable={setSelectedTable}
        />
      </ScaffoldSection>
    </ScaffoldContainer>
  )
}

PrivilegesPage.getLayout = (page) => <AuthLayout title="Column Privileges">{page}</AuthLayout>

export default PrivilegesPage
