import { useState, useRef, useEffect } from "react";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import ModalBox from "./ModalBox";

export default function ElicitationForm({elicitData}) {
    const [values, setValues] = useState({});
    const sent = useRef(false);

    function dismissForm() {
        if (!sent.current) {
            elicitData.finishForm("cancel");
            sent.current = true;
            setValues({});
        }
    }

    function acceptForm() {
        if (!sent.current) {
            elicitData.finishForm("accept", values);
            sent.current = true;
            setValues({});
        }
    }

    function rejectForm() {
        if (!sent.current) {
            elicitData.finishForm("decline");
            sent.current = true;
            setValues({});
        }
    }

    function isSubmitEnabled() {
        if (!elicitData) return;
        for (let formKey in elicitData.requests) {
            let fields = elicitData.requests[formKey].schema;
            for (let required of (fields.required ?? [])) {
                let val = getValue(formKey, required);
                if (val == null || val === "")
                    return false;
            }
        }
        
        return true;
    }

    function getValue(formKey, fieldKey) {
        return values[formKey]?.[fieldKey];
    }

    function setValue(formKey, fieldKey, value) {
        setValues(prev => {
            let form = prev[formKey] ?? {};
            return {
                ...prev, 
                [formKey]: {
                    ...form,
                    [fieldKey]: value
                }
            }
        });
    }
    
    useEffect(() => {
        if (!elicitData) return;

        sent.current = false;
        for (let formKey in elicitData.requests) {
            let fields = elicitData.requests[formKey].schema;

            for (let fieldKey in fields.properties) {
                let field = fields.properties[fieldKey];
                
                if (field.type == "array")
                    setValue(formKey, fieldKey, []);

                if (field.default != null) {
                    if (field.type != "string" || field.enum || field.oneOf)
                        setValue(formKey, fieldKey, field.default);
                }
            }
        }

        return () => {
            if (!sent.current) {
                elicitData.finishForm("cancel");
                sent.current = true;
            }
        }
    }, [elicitData]);

    if (!elicitData) return null;

    let name = elicitData.name ? `${elicitData.name} (${elicitData.url})` : elicitData.url;
    let title = `${name} solicita información adicional`;

    let requests = Object.entries(elicitData.requests);
    let allFields = requests.map(([formKey, req]) => {
        let props = Object.entries(req.schema.properties);
        let fields = props.map(([fieldKey, field]) => {
            let fullKey = formKey + "-" + fieldKey;
            let label = field.title ?? field.description ?? fieldKey;
            let required = req.schema.required?.includes?.(fieldKey) ?? false;

            if (field.type == "string") {
                if (field.enum)
                    return <FormControl key={fullKey} variant="outlined" fullWidth>
                        <InputLabel id={fullKey + "-label"}>{label}</InputLabel>
                        <Select
                            labelId={fullKey + "-label"}
                            id={fullKey}
                            label={label}
                            value={getValue(formKey, fieldKey) ?? ""}
                            onChange={e => setValue(formKey, fieldKey, e.target.value)}>
                            {field.enum.map(val => <MenuItem key={val} value={val}>{val}</MenuItem>)}
                        </Select>
                    </FormControl>;
                
                if (field.oneOf)
                    return <FormControl key={fullKey} variant="outlined" fullWidth>
                        <InputLabel id={fullKey + "-label"}>{label}</InputLabel>
                        <Select
                            labelId={fullKey + "-label"}
                            id={fullKey}
                            label={label}
                            value={getValue(formKey, fieldKey) ?? ""}
                            onChange={e => setValue(formKey, fieldKey, e.target.value)}>
                            {field.oneOf.map(val => 
                                <MenuItem key={val.const} value={val.const}>{val.title}</MenuItem>
                            )}
                        </Select>
                    </FormControl>;
                
                let format = ({
                    email: "email",
                    uri: "url",
                    date: "date",
                    "date-time": "datetime-local"
                })[field.format] ?? "text";

                return <TextField 
                    key={fullKey}
                    id={fullKey + "-field"}
                    variant="outlined"
                    fullWidth
                    type={format}
                    placeholder={field.default}
                    required={required}
                    label={label}
                    value={getValue(formKey, fieldKey) ?? ""}
                    onChange={e => setValue(formKey, fieldKey, e.target.value)}/>;
            }

            if (field.type == "number" || field.type == "integer")
                return <TextField 
                    key={fullKey}
                    id={fullKey + "-field"}
                    type="number"
                    variant="outlined"
                    fullWidth
                    required={required}
                    label={label}
                    onChange={e => {
                        let val = e.target.value;
                        let num = val === "" ? undefined : +val;
                        setValue(formKey, fieldKey, num != null && Number.isFinite(num) ? num : undefined);
                    }}
                    value={getValue(formKey, fieldKey) ?? ""}/>;
                           

            if (field.type == "boolean")
                return <FormControlLabel
                    key={fullKey}
                    id={fullKey + "-field"}
                    required={required}
                    control={<Checkbox
                        checked={getValue(formKey, fieldKey) == true}
                        onChange={e => setValue(formKey, fieldKey, e.target.checked)}/>}
                    label={label}/>

            if (field.type == "array") {
                if (field.items.enum)
                    return <FormControl key={fullKey} variant="outlined" fullWidth>
                        <InputLabel id={fullKey + "-label"}>{label}</InputLabel>
                        <Select
                            labelId={fullKey + "-label"}
                            id={fullKey}
                            multiple
                            input={<OutlinedInput label={label}/>}
                            value={getValue(formKey, fieldKey) ?? []}
                            onChange={e => {
                                let val = e.target.value;
                                setValue(formKey, fieldKey, typeof val == "string" ? val.split(",") : val);
                            }}>
                            {field.items.enum.map(val => 
                                <MenuItem key={val} value={val}>{val}</MenuItem>
                            )}
                        </Select>
                    </FormControl>;
                
                if (field.items.anyOf)
                    return <FormControl key={fullKey} variant="outlined" fullWidth>
                        <InputLabel id={fullKey + "-label"}>{label}</InputLabel>
                        <Select
                            labelId={fullKey + "-label"}
                            id={fullKey}
                            multiple
                            input={<OutlinedInput label={label}/>}
                            value={getValue(formKey, fieldKey) ?? []}
                            onChange={e => {
                                let val = e.target.value;
                                setValue(formKey, fieldKey, typeof val == "string" ? val.split(",") : val);
                            }}>
                            {field.items.anyOf.map(val => 
                                <MenuItem key={val.const} value={val.const}>{val.title}</MenuItem>
                            )}
                        </Select>
                    </FormControl>;
            }
        });
    
        return <>
            <Divider key={formKey + "- div"}/>
            <p key={formKey + "- msg"}>{req.message}</p>
            {fields}
        </>
    });

    return <ModalBox
        open={elicitData != null}
        onClose={dismissForm}
        id="elicitation-form"
        title={title}>
        <i>No envíes contraseñas o datos sensibles por este medio.</i>

        {allFields}

        <Button 
            variant="text"
            onClick={rejectForm}>No enviar</Button>
        <Button 
            variant="contained"
            disabled={!isSubmitEnabled()}
            onClick={acceptForm}>Enviar</Button>
    </ModalBox>;
}