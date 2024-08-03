import { Schema, Connection } from 'mongoose';
import { Container } from 'inversify';
import { IDatabaseMigration } from '@adminide-stack/core';
import { CdmLogger } from '@cdm-logger/core';

export const MigrationSchema = new Schema({
    migrated_at: Date,
    name: { required: true, type: String },
});

export async function migrate(db: Connection, container: Container, logger: CdmLogger.ILogger) {
    try {
        const migrations = container.getAll<IDatabaseMigration>('MongodbMigration');
        const model = db.model<any, any>('Migration', MigrationSchema);
        migrations.map(async (migration) => {
            const exists = await model.findOne({ name: migration.id });
            if (!exists) {
                try {
                    await migration.up();
                    await model.create({ name: migration.id, migrated_at: new Date() });
                } catch (e) {
                    console.log(`Can not process migration ${migration.id}: `, e);
                }
            }

            return migration.id;
        });
    } catch (err) {
        console.warn('ignoring migrate database due to ', err.message);
    }

}
