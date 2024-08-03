import { IModuleService } from '../interfaces';
import { Schema, Connection as DBConnection } from 'mongoose';



export const MigrationSchema = new Schema({
    migrated_at: Date,
    name: { required: true, type: String },
});



export class MongoDBMigrationUpgrade {

    constructor(
        private moduleService: IModuleService,
        private mongoDB: DBConnection,
    ) {
    }

    public async migrate(): Promise<any> {
        const container = await this.moduleService.createContext({});
        try {
            const migrations: any[]  = container.getAll('MongodbMigration');
            const model = this.mongoDB.model('Migration', MigrationSchema);
    
            return Promise.all(
                migrations.map(async (migration) => {
                    const exists = await model.findOne({ name: migration.constructor.name });
                    if (!exists) {
                        try {
                            await migration.up();
                            await model.create({ name: migration.constructor.name, migrated_at: new Date() });
                        } catch (e) {
                            console.log(`Can not process migration ${migration.constructor.name}: `, e);
                        }
                    }
    
                    return migration.constructor.name;
                }),
            );
        } catch (err) {
            console.warn('ignoring database migratoin');
        }
    }
}

